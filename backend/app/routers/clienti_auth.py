"""Router per autenticazione clienti, ordini e preferiti."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid

from app.database import get_db
from app.models.cliente_account import ClienteAccount
from app.models.ordine_ecommerce import OrdineEcommerce, ItemOrdine, StatoOrdine
from app.models.preferito import Preferito
from app.schemas.cliente_auth import (
    ClienteRegistrazione, ClienteLogin, ClienteResponse, ClienteUpdate,
    TokenResponse, CreaOrdineSchema, OrdineResponse, RichiestaReso,
    PreferitoCreate, PreferitoResponse
)
from app.services.auth_service import (
    hash_password, verify_password, create_access_token, get_current_cliente
)

router = APIRouter(prefix="/api/clienti", tags=["Clienti"])


# === AUTENTICAZIONE ===

@router.post("/registrazione", response_model=TokenResponse)
def registrazione(data: ClienteRegistrazione, db: Session = Depends(get_db)):
    """Registrazione nuovo cliente."""
    # Verifica se email già esistente
    existing = db.query(ClienteAccount).filter(ClienteAccount.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email già registrata"
        )
    
    # Crea account
    cliente = ClienteAccount(
        email=data.email,
        password_hash=hash_password(data.password),
        nome=data.nome,
        cognome=data.cognome,
        telefono=data.telefono,
        indirizzo=data.indirizzo,
        citta=data.citta,
        cap=data.cap,
        provincia=data.provincia,
    )
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    
    # Genera token
    token = create_access_token(data={"sub": cliente.id})
    
    return TokenResponse(access_token=token, cliente=ClienteResponse.from_orm(cliente))


@router.post("/login", response_model=TokenResponse)
def login(data: ClienteLogin, db: Session = Depends(get_db)):
    """Login cliente."""
    cliente = db.query(ClienteAccount).filter(ClienteAccount.email == data.email).first()
    
    if not cliente or not verify_password(data.password, cliente.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o password non validi"
        )
    
    if not cliente.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disattivato"
        )
    
    token = create_access_token(data={"sub": cliente.id})
    
    return TokenResponse(access_token=token, cliente=ClienteResponse.from_orm(cliente))


@router.get("/me", response_model=ClienteResponse)
async def get_profilo(cliente: ClienteAccount = Depends(get_current_cliente)):
    """Ottieni profilo cliente corrente."""
    return cliente


@router.put("/me", response_model=ClienteResponse)
async def update_profilo(
    data: ClienteUpdate,
    cliente: ClienteAccount = Depends(get_current_cliente),
    db: Session = Depends(get_db)
):
    """Aggiorna profilo cliente."""
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(cliente, key, value)
    
    db.commit()
    db.refresh(cliente)
    return cliente


# === ORDINI ===

@router.post("/ordini", response_model=OrdineResponse)
async def crea_ordine(
    data: CreaOrdineSchema,
    cliente: ClienteAccount = Depends(get_current_cliente),
    db: Session = Depends(get_db)
):
    """Crea un nuovo ordine."""
    # Calcola totale
    totale = sum(item.prezzo_unitario * item.quantita for item in data.items)
    
    # Genera numero ordine univoco
    numero_ordine = f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
    
    ordine = OrdineEcommerce(
        cliente_id=cliente.id,
        numero_ordine=numero_ordine,
        stato=StatoOrdine.IN_ATTESA,
        totale=totale,
        indirizzo_spedizione=data.indirizzo_spedizione or cliente.indirizzo,
        note=data.note,
    )
    db.add(ordine)
    db.flush()
    
    # Aggiungi items
    for item_data in data.items:
        item = ItemOrdine(
            ordine_id=ordine.id,
            prodotto_id=item_data.prodotto_id,
            nome_prodotto=item_data.nome_prodotto,
            quantita=item_data.quantita,
            prezzo_unitario=item_data.prezzo_unitario,
            immagine_url=item_data.immagine_url,
        )
        db.add(item)
    
    db.commit()
    db.refresh(ordine)
    return ordine


@router.get("/ordini", response_model=list[OrdineResponse])
async def lista_ordini(
    cliente: ClienteAccount = Depends(get_current_cliente),
    db: Session = Depends(get_db)
):
    """Lista ordini del cliente."""
    ordini = (
        db.query(OrdineEcommerce)
        .filter(OrdineEcommerce.cliente_id == cliente.id)
        .order_by(OrdineEcommerce.data_ordine.desc())
        .all()
    )
    return ordini


@router.get("/ordini/{ordine_id}", response_model=OrdineResponse)
async def dettaglio_ordine(
    ordine_id: int,
    cliente: ClienteAccount = Depends(get_current_cliente),
    db: Session = Depends(get_db)
):
    """Dettaglio singolo ordine."""
    ordine = (
        db.query(OrdineEcommerce)
        .filter(OrdineEcommerce.id == ordine_id, OrdineEcommerce.cliente_id == cliente.id)
        .first()
    )
    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    return ordine


@router.post("/ordini/{ordine_id}/reso")
async def richiedi_reso(
    ordine_id: int,
    data: RichiestaReso,
    cliente: ClienteAccount = Depends(get_current_cliente),
    db: Session = Depends(get_db)
):
    """
    Richiedi reso per un ordine.
    Il reso è possibile SOLO entro 14 giorni dalla data di consegna.
    """
    ordine = (
        db.query(OrdineEcommerce)
        .filter(OrdineEcommerce.id == ordine_id, OrdineEcommerce.cliente_id == cliente.id)
        .first()
    )
    
    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    
    if ordine.stato != StatoOrdine.CONSEGNATO:
        raise HTTPException(
            status_code=400,
            detail="Il reso è possibile solo per ordini consegnati"
        )
    
    if not ordine.data_consegna:
        raise HTTPException(
            status_code=400,
            detail="Data di consegna non disponibile"
        )
    
    # Verifica 14 giorni dalla consegna
    giorni_dalla_consegna = (datetime.utcnow() - ordine.data_consegna).days
    if giorni_dalla_consegna > 14:
        raise HTTPException(
            status_code=400,
            detail=f"Il periodo per il reso è scaduto. Sono passati {giorni_dalla_consegna} giorni dalla consegna (massimo 14)."
        )
    
    # Aggiorna stato
    ordine.stato = StatoOrdine.RESO_RICHIESTO
    ordine.motivo_reso = data.motivo
    ordine.data_richiesta_reso = datetime.utcnow()
    
    db.commit()
    db.refresh(ordine)
    
    return {
        "message": "Richiesta di reso inviata con successo",
        "ordine_id": ordine.id,
        "stato": ordine.stato
    }


# === PREFERITI ===

@router.get("/preferiti", response_model=list[PreferitoResponse])
async def lista_preferiti(
    cliente: ClienteAccount = Depends(get_current_cliente),
    db: Session = Depends(get_db)
):
    """Lista preferiti del cliente."""
    return (
        db.query(Preferito)
        .filter(Preferito.cliente_id == cliente.id)
        .order_by(Preferito.added_at.desc())
        .all()
    )


@router.post("/preferiti", response_model=PreferitoResponse)
async def aggiungi_preferito(
    data: PreferitoCreate,
    cliente: ClienteAccount = Depends(get_current_cliente),
    db: Session = Depends(get_db)
):
    """Aggiungi prodotto ai preferiti."""
    # Verifica se già presente
    existing = (
        db.query(Preferito)
        .filter(Preferito.cliente_id == cliente.id, Preferito.prodotto_id == data.prodotto_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Prodotto già nei preferiti")
    
    preferito = Preferito(
        cliente_id=cliente.id,
        prodotto_id=data.prodotto_id,
        nome_prodotto=data.nome_prodotto,
        prezzo=data.prezzo,
        immagine_url=data.immagine_url,
    )
    db.add(preferito)
    db.commit()
    db.refresh(preferito)
    return preferito


@router.delete("/preferiti/{prodotto_id}")
async def rimuovi_preferito(
    prodotto_id: int,
    cliente: ClienteAccount = Depends(get_current_cliente),
    db: Session = Depends(get_db)
):
    """Rimuovi prodotto dai preferiti."""
    preferito = (
        db.query(Preferito)
        .filter(Preferito.cliente_id == cliente.id, Preferito.prodotto_id == prodotto_id)
        .first()
    )
    if not preferito:
        raise HTTPException(status_code=404, detail="Preferito non trovato")
    
    db.delete(preferito)
    db.commit()
    return {"message": "Rimosso dai preferiti"}