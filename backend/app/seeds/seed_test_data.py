"""
Seed dati di test realistici per ambiente test (TCG + Videogiochi).

Eseguire con:
    docker exec magazzino_backend python -m app.seeds.seed_test_data
"""

import os
import sys
from datetime import datetime, timezone
from typing import Optional

# Aggiungi il path del backend al sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import SessionLocal
from app.models.categoria import Categoria
from app.models.cliente import Cliente
from app.models.fornitore import Fornitore
from app.models.ordine import Ordine, RigaOrdine, StatoOrdine
from app.models.prodotto import Prodotto
from app.models.ubicazione import Ubicazione
from app.seeds.categorie_seed import main as seed_categorie

UBICAZIONI = [
    "Scaffale A1",
    "Scaffale A2",
    "Scaffale B1",
    "Scaffale B2",
    "Cassetto 1",
    "Magazzino",
]

FORNITORI = [
    {
        "nome": "TCG Italia Srl",
        "email": "ordini@tcgitalia.it",
        "telefono": "+39 02 555001",
        "indirizzo": "Via Cardinale 21, Milano",
        "partita_iva": "IT10293847561",
        "note": "Distribuzione prodotti Pokémon e accessori.",
    },
    {
        "nome": "GameStock Europe",
        "email": "sales@gamestock.eu",
        "telefono": "+39 06 4412345",
        "indirizzo": "Viale Europa 88, Roma",
        "partita_iva": "IT56473829105",
        "note": "Fornitore videogiochi retro e current gen.",
    },
    {
        "nome": "Collector's Hub",
        "email": "support@collectorshub.com",
        "telefono": "+39 051 882211",
        "indirizzo": "Via dei Collezionisti 7, Bologna",
        "partita_iva": "IT77889900112",
        "note": "Carte gradate e singole di alta rarità.",
    },
]

PRODOTTI = [
    {
        "nome": "Charizard VMAX Rainbow Rare",
        "sku": "PKM-001",
        "descrizione": "Carta Pokémon Spada e Scudo in versione secret rainbow.",
        "quantita": 3,
        "quantita_minima": 1,
        "prezzo_acquisto": 210.00,
        "prezzo_vendita": 289.90,
        "categoria": "Pokémon",
        "ubicazione": "Scaffale A1",
        "stato_conservazione": "Mint",
        "lingua": "Inglese",
    },
    {
        "nome": "Booster Box Scarlatto e Violetto",
        "sku": "PKM-002",
        "descrizione": "Box sigillato da 36 buste set base italiano.",
        "quantita": 18,
        "quantita_minima": 3,
        "prezzo_acquisto": 108.00,
        "prezzo_vendita": 139.90,
        "categoria": "Pokémon",
        "ubicazione": "Magazzino",
        "stato_conservazione": "Mint",
        "lingua": "Italiano",
    },
    {
        "nome": "Pikachu V Alt Art",
        "sku": "PKM-003",
        "descrizione": "Carta alternativa full art da collezione.",
        "quantita": 5,
        "quantita_minima": 1,
        "prezzo_acquisto": 75.00,
        "prezzo_vendita": 109.90,
        "categoria": "Pokémon",
        "ubicazione": "Scaffale A1",
        "stato_conservazione": "Near Mint",
        "lingua": "Giapponese",
    },
    {
        "nome": "Elite Trainer Box Evoluzioni Prismatiche",
        "sku": "PKM-004",
        "descrizione": "ETB sigillata con promo esclusiva.",
        "quantita": 11,
        "quantita_minima": 2,
        "prezzo_acquisto": 42.00,
        "prezzo_vendita": 59.90,
        "categoria": "Pokémon",
        "ubicazione": "Scaffale B1",
        "stato_conservazione": "Mint",
        "lingua": "Italiano",
    },
    {
        "nome": "Mew ex Special Illustration Rare",
        "sku": "PKM-005",
        "descrizione": "Carta singola in ottimo stato da set competitivo.",
        "quantita": 7,
        "quantita_minima": 2,
        "prezzo_acquisto": 38.00,
        "prezzo_vendita": 54.90,
        "categoria": "Pokémon",
        "ubicazione": "Cassetto 1",
        "stato_conservazione": "Excellent",
        "lingua": "Inglese",
    },
    {
        "nome": "Black Lotus (Reserved List)",
        "sku": "MTG-001",
        "descrizione": "Carta iconica Reserved List, autenticata.",
        "quantita": 1,
        "quantita_minima": 1,
        "prezzo_acquisto": 9800.00,
        "prezzo_vendita": 12490.00,
        "categoria": "Magic",
        "ubicazione": "Cassetto 1",
        "stato_conservazione": "Good",
        "lingua": "Inglese",
    },
    {
        "nome": "Fetch Land Misty Rainforest",
        "sku": "MTG-002",
        "descrizione": "Carta staple Modern in condizione Near Mint.",
        "quantita": 12,
        "quantita_minima": 2,
        "prezzo_acquisto": 16.50,
        "prezzo_vendita": 24.90,
        "categoria": "Magic",
        "ubicazione": "Scaffale A2",
        "stato_conservazione": "Near Mint",
        "lingua": "Inglese",
    },
    {
        "nome": "Booster Draft Modern Horizons 3",
        "sku": "MTG-003",
        "descrizione": "Bustina draft singola, confezione sigillata.",
        "quantita": 35,
        "quantita_minima": 5,
        "prezzo_acquisto": 5.60,
        "prezzo_vendita": 8.90,
        "categoria": "Magic",
        "ubicazione": "Scaffale B1",
        "stato_conservazione": "Mint",
        "lingua": "Italiano",
    },
    {
        "nome": "Commander Deck Graveyard Overdrive",
        "sku": "MTG-004",
        "descrizione": "Mazzo commander preconfezionato.",
        "quantita": 9,
        "quantita_minima": 2,
        "prezzo_acquisto": 29.00,
        "prezzo_vendita": 44.90,
        "categoria": "Magic",
        "ubicazione": "Scaffale B2",
        "stato_conservazione": "Mint",
        "lingua": "Inglese",
    },
    {
        "nome": "Liliana of the Veil Borderless",
        "sku": "MTG-005",
        "descrizione": "Planeswalker borderless foil.",
        "quantita": 4,
        "quantita_minima": 1,
        "prezzo_acquisto": 39.90,
        "prezzo_vendita": 58.00,
        "categoria": "Magic",
        "ubicazione": "Scaffale A2",
        "stato_conservazione": "Excellent",
        "lingua": "Inglese",
    },
    {
        "nome": "Blue-Eyes White Dragon LOB",
        "sku": "YGO-001",
        "descrizione": "Prima edizione Legend of Blue Eyes.",
        "quantita": 2,
        "quantita_minima": 1,
        "prezzo_acquisto": 180.00,
        "prezzo_vendita": 269.90,
        "categoria": "Yu-Gi-Oh!",
        "ubicazione": "Cassetto 1",
        "stato_conservazione": "Good",
        "lingua": "Inglese",
    },
    {
        "nome": "Dark Magician Girl PSA 10",
        "sku": "YGO-002",
        "descrizione": "Carta gradata PSA 10 con slab originale.",
        "quantita": 1,
        "quantita_minima": 1,
        "prezzo_acquisto": 620.00,
        "prezzo_vendita": 899.00,
        "categoria": "Yu-Gi-Oh!",
        "ubicazione": "Cassetto 1",
        "stato_conservazione": "Mint",
        "lingua": "Giapponese",
    },
    {
        "nome": "Booster Box 25th Anniversary Rarity Collection",
        "sku": "YGO-003",
        "descrizione": "Box sigillato collezione anniversario.",
        "quantita": 10,
        "quantita_minima": 2,
        "prezzo_acquisto": 54.00,
        "prezzo_vendita": 79.90,
        "categoria": "Yu-Gi-Oh!",
        "ubicazione": "Scaffale B2",
        "stato_conservazione": "Mint",
        "lingua": "Italiano",
    },
    {
        "nome": "Elemental HERO Stratos Ultimate Rare",
        "sku": "YGO-004",
        "descrizione": "Carta singola old school Ultimate Rare.",
        "quantita": 3,
        "quantita_minima": 1,
        "prezzo_acquisto": 95.00,
        "prezzo_vendita": 139.00,
        "categoria": "Yu-Gi-Oh!",
        "ubicazione": "Scaffale A1",
        "stato_conservazione": "Near Mint",
        "lingua": "Inglese",
    },
    {
        "nome": "Pokemon Red Version GameBoy",
        "sku": "VG-001",
        "descrizione": "Cartuccia originale PAL, testata e funzionante.",
        "quantita": 6,
        "quantita_minima": 1,
        "prezzo_acquisto": 45.00,
        "prezzo_vendita": 79.90,
        "categoria": "Nintendo",
        "ubicazione": "Scaffale B1",
        "stato_conservazione": "Good",
        "lingua": "Inglese",
    },
    {
        "nome": "Final Fantasy VII PS1",
        "sku": "VG-002",
        "descrizione": "Versione PAL ITA completa di manuale.",
        "quantita": 4,
        "quantita_minima": 1,
        "prezzo_acquisto": 55.00,
        "prezzo_vendita": 89.90,
        "categoria": "PlayStation",
        "ubicazione": "Scaffale B2",
        "stato_conservazione": "Excellent",
        "lingua": "Italiano",
    },
    {
        "nome": "Super Mario 64 N64",
        "sku": "VG-003",
        "descrizione": "Cartuccia Nintendo 64 in ottime condizioni.",
        "quantita": 8,
        "quantita_minima": 2,
        "prezzo_acquisto": 34.00,
        "prezzo_vendita": 59.90,
        "categoria": "Nintendo",
        "ubicazione": "Scaffale A2",
        "stato_conservazione": "Excellent",
        "lingua": "Inglese",
    },
    {
        "nome": "Metal Gear Solid 3 PS2",
        "sku": "VG-004",
        "descrizione": "Edizione originale con custodia e booklet.",
        "quantita": 5,
        "quantita_minima": 1,
        "prezzo_acquisto": 22.00,
        "prezzo_vendita": 39.90,
        "categoria": "PlayStation 2",
        "ubicazione": "Scaffale B2",
        "stato_conservazione": "Good",
        "lingua": "Italiano",
    },
    {
        "nome": "The Legend of Zelda Ocarina of Time",
        "sku": "VG-005",
        "descrizione": "Versione N64 PAL con etichetta integra.",
        "quantita": 3,
        "quantita_minima": 1,
        "prezzo_acquisto": 49.00,
        "prezzo_vendita": 84.90,
        "categoria": "Nintendo",
        "ubicazione": "Scaffale A2",
        "stato_conservazione": "Near Mint",
        "lingua": "Italiano",
    },
    {
        "nome": "Resident Evil 2 PS1",
        "sku": "VG-006",
        "descrizione": "Doppio disco PAL completo.",
        "quantita": 5,
        "quantita_minima": 1,
        "prezzo_acquisto": 41.00,
        "prezzo_vendita": 69.90,
        "categoria": "PlayStation",
        "ubicazione": "Scaffale B1",
        "stato_conservazione": "Good",
        "lingua": "Inglese",
    },
]

CLIENTI = [
    {
        "nome": "Marco",
        "cognome": "Rossi",
        "email": "marco.rossi@example.it",
        "telefono": "+39 333 1234567",
        "indirizzo": "Via Roma 10",
        "citta": "Milano",
        "cap": "20100",
        "provincia": "MI",
        "codice_fiscale": "RSSMRC85A01F205X",
        "tipo": "privato",
        "note": "Collezionista Pokémon vintage.",
    },
    {
        "nome": "Giulia",
        "cognome": "Bianchi",
        "email": "giulia.bianchi@example.it",
        "telefono": "+39 347 7654321",
        "indirizzo": "Corso Torino 55",
        "citta": "Torino",
        "cap": "10100",
        "provincia": "TO",
        "codice_fiscale": "BNCGLI90C41L219Y",
        "tipo": "privato",
        "note": "Acquista soprattutto videogiochi retro.",
    },
    {
        "nome": "Luca",
        "cognome": "Verdi",
        "email": "luca.verdi@example.it",
        "telefono": "+39 340 9988776",
        "indirizzo": "Via Dante 3",
        "citta": "Bologna",
        "cap": "40100",
        "provincia": "BO",
        "codice_fiscale": "VRDLCU88E15A944Z",
        "tipo": "privato",
        "note": "Giocatore competitivo Magic.",
    },
    {
        "nome": "Sara",
        "cognome": "Neri",
        "email": "sara.neri@example.it",
        "telefono": "+39 349 1122334",
        "indirizzo": "Piazza Duomo 2",
        "citta": "Firenze",
        "cap": "50100",
        "provincia": "FI",
        "codice_fiscale": "NRISRA92H50D612P",
        "tipo": "privato",
        "note": "Preferisce prodotti sigillati.",
    },
    {
        "nome": "Alessandro",
        "cognome": "Conti",
        "email": "alessandro.conti@example.it",
        "telefono": "+39 392 5566778",
        "indirizzo": "Via Mazzini 48",
        "citta": "Napoli",
        "cap": "80100",
        "provincia": "NA",
        "codice_fiscale": "CNTLSN87M12F839Q",
        "tipo": "privato",
        "note": "Cliente abituale Yu-Gi-Oh!",
    },
]

ORDINI = [
    {
        "numero_ordine": "ORD-TEST-001",
        "cliente_email": "marco.rossi@example.it",
        "stato": StatoOrdine.confermato,
        "note": "Spedizione standard",
        "corriere": "GLS",
        "tracking_number": "GLS001TEST",
        "righe": [
            {"sku": "PKM-002", "quantita": 1, "prezzo_unitario": 139.90},
            {"sku": "PKM-005", "quantita": 1, "prezzo_unitario": 54.90},
        ],
    },
    {
        "numero_ordine": "ORD-TEST-002",
        "cliente_email": "giulia.bianchi@example.it",
        "stato": StatoOrdine.completato,
        "note": "Ritiro in negozio",
        "corriere": "Ritiro",
        "tracking_number": None,
        "righe": [
            {"sku": "VG-002", "quantita": 1, "prezzo_unitario": 89.90},
            {"sku": "VG-006", "quantita": 1, "prezzo_unitario": 69.90},
        ],
    },
    {
        "numero_ordine": "ORD-TEST-003",
        "cliente_email": "luca.verdi@example.it",
        "stato": StatoOrdine.bozza,
        "note": "In attesa pagamento",
        "corriere": "BRT",
        "tracking_number": "BRT003TEST",
        "righe": [
            {"sku": "MTG-003", "quantita": 4, "prezzo_unitario": 8.90},
            {"sku": "MTG-002", "quantita": 2, "prezzo_unitario": 24.90},
        ],
    },
    {
        "numero_ordine": "ORD-TEST-004",
        "cliente_email": "sara.neri@example.it",
        "stato": StatoOrdine.spedito,
        "note": "Imballaggio rinforzato",
        "corriere": "SDA",
        "tracking_number": "SDA004TEST",
        "righe": [
            {"sku": "YGO-003", "quantita": 2, "prezzo_unitario": 79.90},
            {"sku": "PKM-004", "quantita": 1, "prezzo_unitario": 59.90},
        ],
    },
    {
        "numero_ordine": "ORD-TEST-005",
        "cliente_email": "alessandro.conti@example.it",
        "stato": StatoOrdine.confermato,
        "note": "Consegna veloce",
        "corriere": "UPS",
        "tracking_number": "UPS005TEST",
        "righe": [
            {"sku": "YGO-001", "quantita": 1, "prezzo_unitario": 269.90},
            {"sku": "VG-003", "quantita": 1, "prezzo_unitario": 59.90},
        ],
    },
]


def get_or_create(db, model, lookup: dict, values: Optional[dict] = None):
    instance = db.query(model).filter_by(**lookup).first()
    if instance:
        return instance, False

    payload = dict(lookup)
    if values:
        payload.update(values)

    instance = model(**payload)
    db.add(instance)
    db.flush()
    return instance, True


def seed_ubicazioni(db, summary):
    for nome in UBICAZIONI:
        _, created = get_or_create(db, Ubicazione, {"nome": nome})
        if created:
            summary["ubicazioni"] += 1


def seed_fornitori(db, summary):
    for data in FORNITORI:
        lookup = {"partita_iva": data["partita_iva"]}
        _, created = get_or_create(db, Fornitore, lookup, data)
        if created:
            summary["fornitori"] += 1


def seed_prodotti(db, summary):
    categorie = {categoria.nome: categoria for categoria in db.query(Categoria).all()}
    ubicazioni = {ubicazione.nome: ubicazione for ubicazione in db.query(Ubicazione).all()}

    for data in PRODOTTI:
        categoria = categorie.get(data["categoria"])
        ubicazione = ubicazioni.get(data["ubicazione"])

        if categoria is None or ubicazione is None:
            raise ValueError(
                f"Categoria o ubicazione non trovata per SKU {data['sku']} "
                f"(categoria={data['categoria']}, ubicazione={data['ubicazione']})"
            )

        payload = {
            "nome": data["nome"],
            "descrizione": data["descrizione"],
            "quantita": data["quantita"],
            "quantita_minima": data["quantita_minima"],
            "prezzo_acquisto": data["prezzo_acquisto"],
            "prezzo_vendita": data["prezzo_vendita"],
            "categoria_id": categoria.id,
            "ubicazione_id": ubicazione.id,
            "stato_conservazione": data["stato_conservazione"],
            "lingua": data["lingua"],
        }

        _, created = get_or_create(db, Prodotto, {"sku": data["sku"]}, payload)
        if created:
            summary["prodotti"] += 1


def seed_clienti(db, summary):
    for data in CLIENTI:
        lookup = {"email": data["email"]}
        _, created = get_or_create(db, Cliente, lookup, data)
        if created:
            summary["clienti"] += 1


def seed_ordini(db, summary):
    clienti = {cliente.email: cliente for cliente in db.query(Cliente).all()}
    prodotti = {prodotto.sku: prodotto for prodotto in db.query(Prodotto).all()}

    for data in ORDINI:
        cliente = clienti.get(data["cliente_email"])
        if cliente is None:
            raise ValueError(f"Cliente non trovato per email: {data['cliente_email']}")

        ordine, created = get_or_create(
            db,
            Ordine,
            {"numero_ordine": data["numero_ordine"]},
            {
                "cliente_id": cliente.id,
                "cliente_nome": f"{cliente.nome} {cliente.cognome or ''}".strip(),
                "stato": data["stato"],
                "note": data["note"],
                "data_ordine": datetime.now(timezone.utc),
                "totale": 0.0,
                "corriere": data["corriere"],
                "tracking_number": data["tracking_number"],
            },
        )
        if not created:
            continue

        totale = 0.0
        for riga in data["righe"]:
            prodotto = prodotti.get(riga["sku"])
            if prodotto is None:
                raise ValueError(f"Prodotto non trovato per SKU: {riga['sku']}")

            subtotale = float(riga["quantita"] * riga["prezzo_unitario"])
            db.add(
                RigaOrdine(
                    ordine_id=ordine.id,
                    prodotto_id=prodotto.id,
                    quantita=riga["quantita"],
                    prezzo_unitario=riga["prezzo_unitario"],
                    subtotale=subtotale,
                )
            )
            totale += subtotale

        ordine.totale = totale
        summary["ordini"] += 1


def main():
    summary = {
        "ubicazioni": 0,
        "fornitori": 0,
        "prodotti": 0,
        "clienti": 0,
        "ordini": 0,
    }

    db = SessionLocal()
    try:
        print("Seeding ubicazioni...")
        seed_ubicazioni(db, summary)
        db.commit()

        print("Seeding categorie...")
        seed_categorie()

        print("Seeding fornitori...")
        seed_fornitori(db, summary)

        print("Seeding prodotti...")
        seed_prodotti(db, summary)

        print("Seeding clienti...")
        seed_clienti(db, summary)

        print("Seeding ordini...")
        seed_ordini(db, summary)

        db.commit()

        print("✅ Seed test completato")
        print("Riepilogo creazioni:")
        for key, value in summary.items():
            print(f"  - {key}: {value}")
    except Exception as exc:
        db.rollback()
        print(f"❌ Errore durante il seed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
