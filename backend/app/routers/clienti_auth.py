"""Router per autenticazione clienti, ordini e preferiti."""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import uuid

from app.database import get_db
from app.models.cliente_account import ClienteAccount
from app.models.ordine_ecommerce import OrdineEcommerce, ItemOrdine, StatoOrdine
from app.models.preferito import Preferito
from app.models.ordine import Ordine as OrdineGestionale, RigaOrdine
from app.models.cliente import Cliente as ClienteGestionale
from app.schemas.cliente_auth import (
    ClienteRegistrazione, ClienteLogin, ClienteResponse, ClienteUpdate,
    TokenResponse, CreaOrdineSchema, OrdineResponse, RichiestaReso,
    PreferitoCreate, PreferitoResponse, AggiornaStatoOrdineSchema,
)
from app.services.auth_service import (
    hash_password, verify_password, create_access_token, get_current_cliente
)
from app.services.email_cliente_service import (
    send_email_conferma_ordine, send_email_conferma_spedizione,
)

router = APIRouter(prefix="/api/clienti", tags=["Clienti"])

# Aliquota IVA standard italiana
IVA_RATE = 0.22


# === AUTENTICAZIONE ===

@router.post("/registrazione", response_model=TokenResponse)
def registrazione(data: ClienteRegistrazione, db: Session = Depends(get_db)):
    """Registrazione nuovo cliente."""
    existing = db.query(ClienteAccount).filter(ClienteAccount.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email già registrata"
        )

    cliente = ClienteAccount(
        email=data.email,
        password_hash=hash_password(data.password),
        nome=data.nome,
        cognome=data.cognome,
        telefono=data.telefono,
        indirizzo=data.indirizzo,
        numero_civico=data.numero_civico,
        citta=data.citta,
        cap=data.cap,
        provincia=data.provincia,
        paese=data.paese,
        indirizzo_nome_destinatario=data.indirizzo_nome_destinatario,
        indirizzo_cognome_destinatario=data.indirizzo_cognome_destinatario,
    )
    db.add(cliente)
    db.commit()
    db.refresh(cliente)

    token = create_access_token(data={"sub": str(cliente.id)})
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

    token = create_access_token(data={"sub": str(cliente.id)})
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

def _build_indirizzo_spedizione(data: CreaOrdineSchema, cliente: ClienteAccount) -> str:
    """Costruisce la stringa indirizzo di spedizione da dati strutturati o profilo cliente."""
    if data.shipping_indirizzo and data.shipping_citta:
        parts = []
        nome = " ".join(filter(None, [data.shipping_nome, data.shipping_cognome]))
        if nome:
            parts.append(nome)
        via = data.shipping_indirizzo
        if data.shipping_numero_civico:
            via += f", {data.shipping_numero_civico}"
        parts.append(via)
        localita = f"{data.shipping_cap or ''} {data.shipping_citta}".strip()
        if data.shipping_provincia:
            localita += f" ({data.shipping_provincia})"
        parts.append(localita)
        if data.shipping_paese and data.shipping_paese != "Italia":
            parts.append(data.shipping_paese)
        if data.shipping_telefono:
            parts.append(f"Tel: {data.shipping_telefono}")
        return " — ".join(parts)

    if data.indirizzo_spedizione:
        return data.indirizzo_spedizione

    if cliente.indirizzo:
        parts = []
        nome_dest = " ".join(filter(None, [
            cliente.indirizzo_nome_destinatario or cliente.nome,
            cliente.indirizzo_cognome_destinatario or cliente.cognome,
        ]))
        if nome_dest:
            parts.append(nome_dest)
        via = cliente.indirizzo
        if cliente.numero_civico:
            via += f", {cliente.numero_civico}"
        parts.append(via)
        localita = f"{cliente.cap or ''} {cliente.citta or ''}".strip()
        if cliente.provincia:
            localita += f" ({cliente.provincia})"
        if localita.strip():
            parts.append(localita)
        if cliente.paese and cliente.paese != "Italia":
            parts.append(cliente.paese)
        if cliente.telefono:
            parts.append(f"Tel: {cliente.telefono}")
        return " — ".join(parts)

    return ""


@router.post("/ordini", response_model=OrdineResponse)
async def crea_ordine(
    data: CreaOrdineSchema,
    background_tasks: BackgroundTasks,
    cliente: ClienteAccount = Depends(get_current_cliente),
    db: Session = Depends(get_db)
):
    """Crea un nuovo ordine."""
    subtotale = sum(item.prezzo_unitario * item.quantita for item in data.items)
    spese_spedizione = data.spese_spedizione or 0.0
    totale = subtotale + spese_spedizione

    indirizzo_spedizione = _build_indirizzo_spedizione(data, cliente)

    if not indirizzo_spedizione:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Inserisci un indirizzo di spedizione prima di procedere con l'ordine."
        )

    numero_ordine = f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

    ordine = OrdineEcommerce(
        cliente_id=cliente.id,
        numero_ordine=numero_ordine,
        stato=StatoOrdine.IN_ATTESA,
        totale=totale,
        subtotale=subtotale,
        spese_spedizione=spese_spedizione,
        metodo_pagamento=data.metodo_pagamento,
        indirizzo_spedizione=indirizzo_spedizione,
        note=data.note,
    )
    db.add(ordine)
    db.flush()

    for item_data in data.items:
        item_subtotale = item_data.quantita * item_data.prezzo_unitario
        item = ItemOrdine(
            ordine_id=ordine.id,
            prodotto_id=item_data.prodotto_id,
            nome_prodotto=item_data.nome_prodotto,
            quantita=item_data.quantita,
            prezzo_unitario=item_data.prezzo_unitario,
            subtotale=item_subtotale,
            immagine_url=item_data.immagine_url,
        )
        db.add(item)

    db.commit()
    db.refresh(ordine)

    background_tasks.add_task(send_email_conferma_ordine, ordine, cliente)
    return _ordine_response_with_cliente(ordine, cliente)


@router.get("/ordini", response_model=list[OrdineResponse])
async def lista_ordini(
    cliente: ClienteAccount = Depends(get_current_cliente),
    db: Session = Depends(get_db)
):
    """Lista ordini del cliente dalla tabella gestionale (ordini)."""
    from sqlalchemy.orm import joinedload

    cliente_gestionale = (
        db.query(ClienteGestionale)
        .filter(ClienteGestionale.email == cliente.email)
        .first()
    )

    if not cliente_gestionale:
        return []

    ordini = (
        db.query(OrdineGestionale)
        .options(
            joinedload(OrdineGestionale.righe).joinedload(RigaOrdine.prodotto)
        )
        .filter(OrdineGestionale.cliente_id == cliente_gestionale.id)
        .order_by(OrdineGestionale.created_at.desc())
        .all()
    )

    return [_ordine_gestionale_to_response(ordine, cliente) for ordine in ordini]


@router.get("/ordini/{ordine_id}", response_model=OrdineResponse)
async def dettaglio_ordine(
    ordine_id: int,
    cliente: ClienteAccount = Depends(get_current_cliente),
    db: Session = Depends(get_db)
):
    """Dettaglio singolo ordine dalla tabella gestionale."""
    from sqlalchemy.orm import joinedload

    cliente_gestionale = (
        db.query(ClienteGestionale)
        .filter(ClienteGestionale.email == cliente.email)
        .first()
    )

    if not cliente_gestionale:
        raise HTTPException(status_code=404, detail="Ordine non trovato")

    ordine = (
        db.query(OrdineGestionale)
        .options(joinedload(OrdineGestionale.righe).joinedload(RigaOrdine.prodotto))
        .filter(
            OrdineGestionale.id == ordine_id,
            OrdineGestionale.cliente_id == cliente_gestionale.id,
        )
        .first()
    )
    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    return _ordine_gestionale_to_response(ordine, cliente)


@router.patch("/ordini/{ordine_id}/stato", response_model=OrdineResponse)
async def aggiorna_stato_ordine(
    ordine_id: int,
    data: AggiornaStatoOrdineSchema,
    background_tasks: BackgroundTasks,
    cliente: ClienteAccount = Depends(get_current_cliente),
    db: Session = Depends(get_db)
):
    """Aggiorna stato ordine."""
    ordine = (
        db.query(OrdineEcommerce)
        .filter(OrdineEcommerce.id == ordine_id, OrdineEcommerce.cliente_id == cliente.id)
        .first()
    )
    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")

    stati_validi = {s.value for s in StatoOrdine}
    if data.stato not in stati_validi:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Stato non valido. Valori consentiti: {', '.join(stati_validi)}"
        )

    vecchio_stato = ordine.stato
    ordine.stato = data.stato
    if data.corriere is not None:
        ordine.corriere = data.corriere
    if data.tracking_number is not None:
        ordine.tracking_number = data.tracking_number
    if data.data_stimata_consegna is not None:
        ordine.data_stimata_consegna = data.data_stimata_consegna

    if data.stato == StatoOrdine.SPEDITO and vecchio_stato != StatoOrdine.SPEDITO:
        ordine.data_spedizione = datetime.utcnow()

    db.commit()
    db.refresh(ordine)

    if data.stato == StatoOrdine.SPEDITO and vecchio_stato != StatoOrdine.SPEDITO:
        background_tasks.add_task(send_email_conferma_spedizione, ordine, cliente)

    return _ordine_response_with_cliente(ordine, cliente)


@router.post("/ordini/{ordine_id}/reso")
async def richiedi_reso(
    ordine_id: int,
    data: RichiestaReso,
    cliente: ClienteAccount = Depends(get_current_cliente),
    db: Session = Depends(get_db)
):
    """Richiedi reso per un ordine."""
    ordine = (
        db.query(OrdineEcommerce)
        .filter(OrdineEcommerce.id == ordine_id, OrdineEcommerce.cliente_id == cliente.id)
        .first()
    )

    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")

    if ordine.stato != StatoOrdine.CONSEGNATO:
        raise HTTPException(status_code=400, detail="Il reso è possibile solo per ordini consegnati")

    if not ordine.data_consegna:
        raise HTTPException(status_code=400, detail="Data di consegna non disponibile")

    giorni_dalla_consegna = (datetime.utcnow() - ordine.data_consegna).days
    if giorni_dalla_consegna > 14:
        raise HTTPException(
            status_code=400,
            detail=f"Il periodo per il reso è scaduto. Sono passati {giorni_dalla_consegna} giorni dalla consegna (massimo 14)."
        )

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


def _ordine_response_with_cliente(ordine: OrdineEcommerce, cliente: ClienteAccount) -> OrdineResponse:
    """Costruisce OrdineResponse arricchito con dati cliente."""
    resp = OrdineResponse.from_orm(ordine)
    resp.cliente_nome = cliente.nome
    resp.cliente_cognome = cliente.cognome
    resp.cliente_email = cliente.email
    return resp


def _ordine_gestionale_to_response(ordine: OrdineGestionale, cliente: ClienteAccount) -> OrdineResponse:
    """Mappa un ordine gestionale (tabella ordini) al formato OrdineResponse del cliente."""
    from app.schemas.cliente_auth import ItemOrdineResponse

    items = []
    for riga in (ordine.righe or []):
        prodotto_id = riga.prodotto_id or 0
        items.append(ItemOrdineResponse(
            id=riga.id,
            prodotto_id=prodotto_id,
            nome_prodotto=riga.prodotto.nome if riga.prodotto else f"Prodotto #{prodotto_id}",
            quantita=riga.quantita,
            prezzo_unitario=float(riga.prezzo_unitario),
            subtotale=float(riga.subtotale),
            immagine_url=None,
        ))

    stato_map = {
        "bozza": "in_attesa",
        "confermato": "in_attesa",
        "spedito": "spedito",
        "completato": "consegnato",
        "annullato": "annullato",
        "reso": "reso_richiesto",
    }
    stato_str = ordine.stato.value if hasattr(ordine.stato, "value") else str(ordine.stato)
    stato_ecommerce = stato_map.get(stato_str, "in_attesa")

    data_ordine = ordine.data_ordine or ordine.created_at or datetime.now(timezone.utc)

    # Leggi i valori reali dal modello gestionale
    spese_spedizione = float(getattr(ordine, "spese_spedizione", None) or 0.0)
    metodo_pagamento = getattr(ordine, "metodo_pagamento", None)
    totale = float(ordine.totale or 0)
    # Calcola IVA inclusa (22%)
    imponibile = round(totale / (1 + IVA_RATE), 2)
    importo_iva = round(totale - imponibile, 2)

    # Costruisci indirizzo di spedizione dal profilo cliente se non presente nell'ordine
    indirizzo_spedizione = getattr(ordine, "indirizzo_spedizione", None)
    if not indirizzo_spedizione:
        parts = []
        nome = f"{cliente.nome or ''} {cliente.cognome or ''}".strip()
        if nome:
            parts.append(nome)
        if cliente.indirizzo:
            via = cliente.indirizzo
            if getattr(cliente, "numero_civico", None):
                via += f", {cliente.numero_civico}"
            parts.append(via)
        localita = f"{getattr(cliente, 'cap', '') or ''} {getattr(cliente, 'citta', '') or ''}".strip()
        if getattr(cliente, "provincia", None):
            localita += f" ({cliente.provincia})"
        if localita.strip():
            parts.append(localita)
        if parts:
            indirizzo_spedizione = " — ".join(parts)

    return OrdineResponse(
        id=ordine.id,
        numero_ordine=ordine.numero_ordine,
        stato=stato_ecommerce,
        totale=totale,
        subtotale=totale - spese_spedizione,
        spese_spedizione=spese_spedizione,
        metodo_pagamento=metodo_pagamento,
        imponibile=imponibile,
        importo_iva=importo_iva,
        aliquota_iva=IVA_RATE * 100,
        indirizzo_spedizione=indirizzo_spedizione,
        note=ordine.note,
        data_ordine=data_ordine,
        data_spedizione=None,
        data_consegna=None,
        data_stimata_consegna=None,
        corriere=ordine.corriere,
        tracking_number=ordine.tracking_number,
        motivo_reso=None,
        items=items,
        cliente_nome=cliente.nome,
        cliente_cognome=cliente.cognome,
        cliente_email=cliente.email,
    )


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
