"""
Servizio email per notifiche ai clienti e-commerce.
I template sono funzioni pure che ricevono i dati e restituiscono HTML.
"""
import html
import logging
from typing import Optional

from app.email_utils import send_email

logger = logging.getLogger(__name__)


def _h(value) -> str:
    """Escape HTML per dati utente."""
    if value is None:
        return ""
    return html.escape(str(value))


def _template_base(titolo: str, corpo_html: str, footer_note: str = "") -> str:
    """Template base riutilizzabile per tutte le email cliente."""
    footer_html = f'<p style="color:#888;font-size:12px;margin-top:16px">{footer_note}</p>' if footer_note else ""
    return f"""<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{_h(titolo)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:32px 16px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:100%">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a237e;padding:24px 32px">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700">Gestione Magazzino</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px">
              <h2 style="color:#1a237e;margin-top:0">{_h(titolo)}</h2>
              {corpo_html}
              {footer_html}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#e8eaf6;padding:16px 32px;text-align:center">
              <p style="margin:0;color:#666;font-size:12px">
                &copy; Gestione Magazzino — Questa è un'email automatica, non rispondere direttamente.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _template_conferma_ordine(ordine, cliente) -> tuple:
    """
    Ritorna (subject, body_html) per email di conferma acquisto.

    Contenuto:
    - Ringraziamento per l'acquisto
    - Numero ordine
    - Riepilogo prodotti (nome, quantità, prezzo unitario, subtotale riga)
    - Subtotale prodotti
    - Spese di spedizione (se > 0, come riga separata)
    - Totale finale
    - Indirizzo di spedizione
    - Nota che riceverà aggiornamenti quando spedito
    """
    nome_cliente = _h(getattr(cliente, "nome", ""))
    cognome_cliente = _h(getattr(cliente, "cognome", ""))

    # Costruisci tabella prodotti
    righe_prodotti = ""
    for item in getattr(ordine, "items", []):
        nome = _h(getattr(item, "nome_prodotto", ""))
        qty = getattr(item, "quantita", 1)
        prezzo_u = getattr(item, "prezzo_unitario", 0.0) or 0.0
        sub = getattr(item, "subtotale", None)
        if sub is None:
            sub = qty * prezzo_u
        righe_prodotti += f"""
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e0e0e0">{nome}</td>
          <td style="padding:10px;border-bottom:1px solid #e0e0e0;text-align:center">{qty}</td>
          <td style="padding:10px;border-bottom:1px solid #e0e0e0;text-align:right">€ {prezzo_u:.2f}</td>
          <td style="padding:10px;border-bottom:1px solid #e0e0e0;text-align:right">€ {sub:.2f}</td>
        </tr>"""

    # Subtotale e spese
    subtotale = getattr(ordine, "subtotale", None)
    spese = getattr(ordine, "spese_spedizione", 0.0) or 0.0
    totale = getattr(ordine, "totale", 0.0) or 0.0
    numero_ordine = _h(getattr(ordine, "numero_ordine", ""))
    indirizzo = _h(getattr(ordine, "indirizzo_spedizione", "") or "")

    riga_subtotale = ""
    if subtotale is not None:
        riga_subtotale = f"""
        <tr>
          <td colspan="3" style="padding:8px;text-align:right;color:#555">Subtotale prodotti:</td>
          <td style="padding:8px;text-align:right">€ {subtotale:.2f}</td>
        </tr>"""

    riga_spese = ""
    if spese > 0:
        riga_spese = f"""
        <tr>
          <td colspan="3" style="padding:8px;text-align:right;color:#555">Spese di spedizione:</td>
          <td style="padding:8px;text-align:right">€ {spese:.2f}</td>
        </tr>"""

    riga_indirizzo = ""
    if indirizzo:
        riga_indirizzo = f"""
        <div style="background:#f5f5f5;border-radius:6px;padding:16px;margin:20px 0">
          <strong>Indirizzo di spedizione:</strong><br>
          <span style="color:#444">{indirizzo}</span>
        </div>"""

    corpo = f"""
    <p>Ciao <strong>{nome_cliente} {cognome_cliente}</strong>,</p>
    <p>Grazie per il tuo acquisto! Il tuo ordine è stato ricevuto con successo.</p>

    <div style="background:#e8eaf6;border-radius:6px;padding:12px 20px;margin:16px 0;display:inline-block">
      <strong style="color:#1a237e">Numero ordine: {numero_ordine}</strong>
    </div>

    <h3 style="color:#1a237e;margin-top:24px">Riepilogo prodotti</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background-color:#e8eaf6">
          <th style="padding:10px;text-align:left">Prodotto</th>
          <th style="padding:10px;text-align:center">Qtà</th>
          <th style="padding:10px;text-align:right">Prezzo unit.</th>
          <th style="padding:10px;text-align:right">Subtotale</th>
        </tr>
      </thead>
      <tbody>
        {righe_prodotti}
        {riga_subtotale}
        {riga_spese}
        <tr style="font-weight:bold;font-size:15px">
          <td colspan="3" style="padding:10px;text-align:right;border-top:2px solid #1a237e;color:#1a237e">Totale finale:</td>
          <td style="padding:10px;text-align:right;border-top:2px solid #1a237e;color:#1a237e">€ {totale:.2f}</td>
        </tr>
      </tbody>
    </table>

    {riga_indirizzo}

    <p style="margin-top:20px;color:#555">
      📦 Ti invieremo un'email di conferma non appena il tuo ordine viene spedito, con tutte le informazioni di tracciamento.
    </p>
    <p>Grazie per aver scelto il nostro store!</p>"""

    subject = f"Conferma ordine {numero_ordine} — Grazie per il tuo acquisto!"
    body_html = _template_base(f"Ordine confermato! #{numero_ordine}", corpo)
    return subject, body_html


def _template_conferma_spedizione(ordine, cliente) -> tuple:
    """
    Ritorna (subject, body_html) per email di conferma spedizione.

    Contenuto:
    - Comunicazione che il prodotto è stato spedito
    - Numero ordine
    - Corriere (se disponibile)
    - Codice di tracciamento (se disponibile)
    - Link per tracciare la spedizione (se disponibile)
    - Data stimata di consegna (se disponibile)
    """
    nome_cliente = _h(getattr(cliente, "nome", ""))
    cognome_cliente = _h(getattr(cliente, "cognome", ""))
    numero_ordine = _h(getattr(ordine, "numero_ordine", ""))
    corriere = getattr(ordine, "corriere", None)
    tracking_number = getattr(ordine, "tracking_number", None)
    data_stimata = getattr(ordine, "data_stimata_consegna", None)

    riga_corriere = ""
    if corriere:
        riga_corriere = f"""
        <div style="margin:8px 0"><strong>Corriere:</strong> {_h(corriere)}</div>"""

    riga_tracking = ""
    if tracking_number:
        tracking_link = _build_tracking_link(corriere, tracking_number)
        if tracking_link:
            riga_tracking = f"""
            <div style="margin:8px 0">
              <strong>Codice di tracciamento:</strong> {_h(tracking_number)}<br>
              <a href="{_h(tracking_link)}" style="color:#1a237e;font-weight:bold">🔍 Traccia la spedizione</a>
            </div>"""
        else:
            riga_tracking = f"""
            <div style="margin:8px 0"><strong>Codice di tracciamento:</strong> {_h(tracking_number)}</div>"""

    riga_data = ""
    if data_stimata:
        data_str = data_stimata.strftime("%d/%m/%Y") if hasattr(data_stimata, "strftime") else _h(str(data_stimata))
        riga_data = f"""
        <div style="margin:8px 0"><strong>Data stimata di consegna:</strong> {data_str}</div>"""

    corpo = f"""
    <p>Ciao <strong>{nome_cliente} {cognome_cliente}</strong>,</p>
    <p>Ottime notizie! Il tuo ordine è stato spedito. 🚚</p>

    <div style="background:#e8eaf6;border-radius:6px;padding:12px 20px;margin:16px 0;display:inline-block">
      <strong style="color:#1a237e">Numero ordine: {numero_ordine}</strong>
    </div>

    <div style="background:#f5f5f5;border-radius:6px;padding:16px 20px;margin:20px 0">
      <h3 style="margin-top:0;color:#1a237e">Dettagli spedizione</h3>
      {riga_corriere}
      {riga_tracking}
      {riga_data}
    </div>

    <p style="color:#555">Se non ricevi il pacco entro i tempi previsti, contattaci rispondendo a questa email.</p>
    <p>Grazie per aver scelto il nostro store!</p>"""

    subject = f"Il tuo ordine {numero_ordine} è in viaggio! 🚚"
    body_html = _template_base(f"Ordine {numero_ordine} spedito!", corpo)
    return subject, body_html


def _build_tracking_link(corriere: Optional[str], tracking_number: str) -> Optional[str]:
    """Costruisce il link di tracking in base al corriere."""
    if not corriere or not tracking_number:
        return None
    corriere_lower = corriere.lower()
    tn = tracking_number.strip()
    if "brt" in corriere_lower or "bartolini" in corriere_lower:
        return f"https://vas.brt.it/vas/sped_det_show.hsm?referer=sped_numspe_par.hsm&Nspedizione={tn}"
    if "gls" in corriere_lower:
        return f"https://gls-group.eu/IT/it/follow-parcels?match={tn}"
    if "dhl" in corriere_lower:
        return f"https://www.dhl.com/it-it/home/tracking.html?tracking-id={tn}"
    if "ups" in corriere_lower:
        return f"https://www.ups.com/track?tracknum={tn}"
    if "sda" in corriere_lower or "poste" in corriere_lower:
        return f"https://www.poste.it/cerca/index.html#/risultati-spedizioni/{tn}"
    if "nexive" in corriere_lower or "nex" in corriere_lower:
        return f"https://www.nexive.it/tracking?barcode={tn}"
    if "fedex" in corriere_lower:
        return f"https://www.fedex.com/fedextrack/?trknbr={tn}"
    return None


def send_email_conferma_ordine(ordine, cliente) -> bool:
    """Invia email di conferma ordine al cliente."""
    try:
        subject, body = _template_conferma_ordine(ordine, cliente)
        result = send_email(to=cliente.email, subject=subject, body_html=body)
        if not result:
            logger.warning(f"Email conferma ordine non inviata per ordine {ordine.numero_ordine}")
        return result
    except Exception as e:
        logger.error(f"Errore invio email conferma ordine {getattr(ordine, 'numero_ordine', '?')}: {e}")
        return False


def send_email_conferma_spedizione(ordine, cliente) -> bool:
    """Invia email di conferma spedizione al cliente."""
    try:
        subject, body = _template_conferma_spedizione(ordine, cliente)
        result = send_email(to=cliente.email, subject=subject, body_html=body)
        if not result:
            logger.warning(f"Email conferma spedizione non inviata per ordine {ordine.numero_ordine}")
        return result
    except Exception as e:
        logger.error(f"Errore invio email conferma spedizione {getattr(ordine, 'numero_ordine', '?')}: {e}")
        return False
