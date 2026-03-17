"""
Utility per generazione codice a barre prodotti.
Usa lo SKU normalizzato CODE39 come valore del barcode.
"""
import re
import uuid


def normalize_for_code39(value: str) -> str:
    """Normalizza una stringa per renderla compatibile con CODE39."""
    if not value:
        return ""
    result = value.upper()
    result = result.replace("_", "-")
    result = re.sub(r"[^0-9A-Z\-. $/+%]", "", result)
    result = re.sub(r"-+", "-", result)
    result = result.strip("-")
    return result


def generate_barcode_value(sku: str) -> str:
    """
    Genera il valore del barcode a partire dallo SKU del prodotto.
    Se lo SKU è CODE39-compatibile, lo usa direttamente.
    Altrimenti genera un codice UUID breve.
    """
    normalized = normalize_for_code39(sku)
    if normalized and len(normalized) >= 3:
        return normalized
    # Fallback: genera un codice univoco
    short_uuid = uuid.uuid4().hex[:12].upper()
    return short_uuid


def is_valid_barcode_value(value: str) -> bool:
    """Verifica che il valore sia valido per CODE39/CODE128."""
    if not value or len(value) < 1:
        return False
    # CODE128 accetta tutti i caratteri ASCII stampabili
    return all(32 <= ord(c) <= 126 for c in value)


def generate_barcode_svg(barcode_value: str) -> str:
    """
    Genera un'immagine SVG del barcode usando python-barcode (Code128).
    Restituisce la stringa SVG o None se python-barcode non è disponibile.
    """
    try:
        import barcode as pybarcode
        from barcode.writer import SVGWriter
        import io

        code = pybarcode.get("code128", barcode_value, writer=SVGWriter())
        buffer = io.BytesIO()
        code.write(buffer)
        return buffer.getvalue().decode("utf-8")
    except ImportError:
        return None
