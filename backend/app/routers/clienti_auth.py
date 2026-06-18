import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_password_hash, verify_password, create_access_token, decode_token_claims
from ..models.cliente_account import ClienteAccount
from ..models.ordine_ecommerce import OrdineEcommerce, RigaOrdineEcommerce, Preferito, StatoOrdineEcommerce
from ..schemas.cliente_auth import (
    ClienteRegistrazione, ClienteLogin, ClienteToken, ClienteResponse,
    ClienteUpdate, ClienteChangePassword,
    OrdineEcommerceResponse, OrdineEcommerceListResponse, RigaOrdineEcommerceResponse,
    RichiestaReso,
    PreferitoCreate, PreferitoResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ecommerce", tags=["Clienti E-commerce"])

# --- Helper: get current customer from JWT ---
def get_current_cliente(token: str = Depends(
    __import__("fastapi.security", fromlist=["OAuth2PasswordBearer"]).OAuth2PasswordBearer(tokenUrl="/api/ecommerce/login")
), db: Session = Depends(get_db)) -> ClienteAccount:
    from joserfc.errors import JoseError
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token non valido",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        claims = decode_token_claims(token)
        if claims.get("type") != "cliente":
            raise credentials_exception
        cliente_id = claims.get("sub")
        if cliente_id is None:
            raise credentials_exception
    except (JoseError, Exception):
        raise credentials_exception

    cliente = db.query(ClienteAccount).filter(ClienteAccount.id == int(cliente_id)).first()
    if cliente is None or not cliente.is_active:
        raise credentials_exception
    return cliente


def _create_cliente_token(cliente: ClienteAccount) -> str:
    """Create a JWT token for a customer"""
    return create_access_token(
        data={"sub": str(cliente.id), "type": "cliente", "email": cliente.email},
        expires_delta=timedelta(hours=24 * 7),  # 7 days for customers
    )


def _is_reso_disponibile(ordine: OrdineEcommerce) -> bool:
    """Check if return is available (within 14 days of delivery)"""
    if ordine.stato not in (StatoOrdineEcommerce.consegnato,):
        return False
    if not ordine.data_consegna:
        return False
    now = datetime.now(timezone.utc)
    deadline = ordine.data_consegna + timedelta(days=14)
    return now <= deadline


# ==================== AUTH ENDPOINTS ====================

@router.post("/registrazione", response_model=ClienteToken, status_code=201)
def registra_cliente(data: ClienteRegistrazione, db: Session = Depends(get_db)):
    """Registra un nuovo cliente"""
    # Check if email already exists
    existing = db.query(ClienteAccount).filter(ClienteAccount.email == data.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")

    # Validate password
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="La password deve avere almeno 6 caratteri")

    cliente = ClienteAccount(
        email=data.email.lower().strip(),
        password_hash=get_password_hash(data.password),
        nome=data.nome.strip(),
        cognome=data.cognome.strip(),
        telefono=data.telefono,
        is_active=True,
        is_verified=False,
    )
    db.add(cliente)
    db.commit()
    db.refresh(cliente)

    token = _create_cliente_token(cliente)
    return ClienteToken(
        access_token=token,
        user=ClienteResponse.model_validate(cliente),
    )


@router.post("/login", response_model=ClienteToken)
def login_cliente(data: ClienteLogin, db: Session = Depends(get_db)):
    """Login cliente"""
    cliente = db.query(ClienteAccount).filter(
        ClienteAccount.email == data.email.lower().strip()
    ).first()

    if not cliente or not verify_password(data.password, cliente.password_hash):
        raise HTTPException(status_code=401, detail="Email o password non corretti")

    if not cliente.is_active:
        raise HTTPException(status_code=403, detail="Account disattivato")

    token = _create_cliente_token(cliente)
    return ClienteToken(
        access_token=token,
        user=ClienteResponse.model_validate(cliente),
    )


@router.get("/me", response_model=ClienteResponse)
def get_profilo(cliente: ClienteAccount = Depends(get_current_cliente)):
    """Get current customer profile"""
    return ClienteResponse.model_validate(cliente)


@router.put("/me", response_model=ClienteResponse)
def aggiorna_profilo(data: ClienteUpdate, cliente: ClienteAccount = Depends(get_current_cliente), db: Session = Depends(get_db)):
    """Update customer profile"""
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(cliente, key, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(cliente)
    return ClienteResponse.model_validate(cliente)


@router.post("/cambio-password")
def cambio_password(data: ClienteChangePassword, cliente: ClienteAccount = Depends(get_current_cliente), db: Session = Depends(get_db)):
    """Change customer password"""
    if not verify_password(data.current_password, cliente.password_hash):
        raise HTTPException(status_code=400, detail="Password attuale non corretta")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="La nuova password deve avere almeno 6 caratteri")
    cliente.password_hash = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Password aggiornata con successo"}


# ==================== ORDERS ENDPOINTS ====================

@router.get("/ordini", response_model=list[OrdineEcommerceListResponse])
def lista_ordini(cliente: ClienteAccount = Depends(get_current_cliente), db: Session = Depends(get_db)):
    """Get customer orders list"""
    ordini = db.query(OrdineEcommerce).filter(
        OrdineEcommerce.cliente_id == cliente.id
    ).order_by(OrdineEcommerce.data_ordine.desc()).all()

    result = []
    for o in ordini:
        result.append(OrdineEcommerceListResponse(
            id=o.id,
            numero_ordine=o.numero_ordine,
            stato=o.stato.value if hasattr(o.stato, 'value') else o.stato,
            totale=o.totale,
            data_ordine=o.data_ordine,
            data_consegna=o.data_consegna,
            reso_disponibile=_is_reso_disponibile(o),
        ))
    return result


@router.get("/ordini/{ordine_id}", response_model=OrdineEcommerceResponse)
def dettaglio_ordine(ordine_id: int, cliente: ClienteAccount = Depends(get_current_cliente), db: Session = Depends(get_db)):
    """Get order detail"""
    ordine = db.query(OrdineEcommerce).filter(
        OrdineEcommerce.id == ordine_id,
        OrdineEcommerce.cliente_id == cliente.id,
    ).first()
    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")

    righe = [RigaOrdineEcommerceResponse.model_validate(r) for r in ordine.righe]
    stato_val = ordine.stato.value if hasattr(ordine.stato, 'value') else ordine.stato

    return OrdineEcommerceResponse(
        id=ordine.id,
        numero_ordine=ordine.numero_ordine,
        stato=stato_val,
        totale=ordine.totale,
        subtotale=ordine.subtotale,
        spese_spedizione=ordine.spese_spedizione,
        metodo_pagamento=ordine.metodo_pagamento,
        indirizzo_spedizione=ordine.indirizzo_spedizione,
        corriere=ordine.corriere,
        tracking_number=ordine.tracking_number,
        data_ordine=ordine.data_ordine,
        data_spedizione=ordine.data_spedizione,
        data_consegna=ordine.data_consegna,
        reso_richiesto_il=ordine.reso_richiesto_il,
        reso_motivo=ordine.reso_motivo,
        note=ordine.note,
        righe=righe,
        reso_disponibile=_is_reso_disponibile(ordine),
    )


@router.post("/ordini/{ordine_id}/reso")
def richiedi_reso(ordine_id: int, data: RichiestaReso, cliente: ClienteAccount = Depends(get_current_cliente), db: Session = Depends(get_db)):
    """Request a return for an order"""
    ordine = db.query(OrdineEcommerce).filter(
        OrdineEcommerce.id == ordine_id,
        OrdineEcommerce.cliente_id == cliente.id,
    ).first()
    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")

    if not _is_reso_disponibile(ordine):
        raise HTTPException(status_code=400, detail="Il reso non è più disponibile per questo ordine")

    if ordine.stato in (StatoOrdineEcommerce.reso_richiesto, StatoOrdineEcommerce.reso_approvato, StatoOrdineEcommerce.reso_completato):
        raise HTTPException(status_code=400, detail="Reso già richiesto per questo ordine")

    ordine.stato = StatoOrdineEcommerce.reso_richiesto
    ordine.reso_richiesto_il = datetime.now(timezone.utc)
    ordine.reso_motivo = data.motivo.strip()
    db.commit()

    return {"message": "Richiesta di reso inviata con successo", "stato": "reso_richiesto"}


# ==================== FAVORITES ENDPOINTS ====================

@router.get("/preferiti", response_model=list[PreferitoResponse])
def lista_preferiti(cliente: ClienteAccount = Depends(get_current_cliente), db: Session = Depends(get_db)):
    """Get customer favorites"""
    preferiti = db.query(Preferito).filter(
        Preferito.cliente_id == cliente.id
    ).order_by(Preferito.created_at.desc()).all()
    return [PreferitoResponse.model_validate(p) for p in preferiti]


@router.post("/preferiti", response_model=PreferitoResponse, status_code=201)
def aggiungi_preferito(data: PreferitoCreate, cliente: ClienteAccount = Depends(get_current_cliente), db: Session = Depends(get_db)):
    """Add a product to favorites"""
    # Check if already in favorites
    existing = db.query(Preferito).filter(
        Preferito.cliente_id == cliente.id,
        Preferito.prodotto_id == data.prodotto_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Prodotto già nei preferiti")

    preferito = Preferito(
        cliente_id=cliente.id,
        prodotto_id=data.prodotto_id,
        nome_prodotto=data.nome_prodotto,
        immagine_url=data.immagine_url,
        prezzo=data.prezzo,
    )
    db.add(preferito)
    db.commit()
    db.refresh(preferito)
    return PreferitoResponse.model_validate(preferito)


@router.delete("/preferiti/{prodotto_id}")
def rimuovi_preferito(prodotto_id: int, cliente: ClienteAccount = Depends(get_current_cliente), db: Session = Depends(get_db)):
    """Remove a product from favorites"""
    preferito = db.query(Preferito).filter(
        Preferito.cliente_id == cliente.id,
        Preferito.prodotto_id == prodotto_id,
    ).first()
    if not preferito:
        raise HTTPException(status_code=404, detail="Prodotto non trovato nei preferiti")
    db.delete(preferito)
    db.commit()
    return {"message": "Prodotto rimosso dai preferiti"}
