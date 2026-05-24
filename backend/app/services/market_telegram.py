"""Helper per inviare messaggi Telegram tramite il bot MARKET_BOT_TOKEN/MARKET_CHAT_ID.

Usa variabili d'ambiente separate dal bot ordini (TELEGRAM_BOT_TOKEN).
Graceful degradation: se le variabili non sono configurate, le chiamate vengono ignorate.
"""
import logging
import os

import httpx

logger = logging.getLogger(__name__)

_BASE_URL = "https://api.telegram.org/bot{token}/sendMessage"


def _get_credentials() -> tuple[str, str]:
    token = os.getenv("MARKET_BOT_TOKEN", "").strip()
    chat_id = os.getenv("MARKET_CHAT_ID", "").strip()
    return token, chat_id


def send_market_message(text: str, parse_mode: str = "Markdown") -> bool:
    """Invia un messaggio Telegram tramite MARKET_BOT_TOKEN.

    Returns:
        True se il messaggio è stato inviato con successo, False altrimenti.
    """
    token, chat_id = _get_credentials()
    if not token or not chat_id:
        logger.warning(
            "market_telegram: MARKET_BOT_TOKEN o MARKET_CHAT_ID non configurati. Messaggio ignorato."
        )
        return False

    url = _BASE_URL.format(token=token)
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                url,
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": parse_mode,
                    "disable_web_page_preview": True,
                },
            )
        if response.status_code == 200:
            logger.info("market_telegram: messaggio inviato con successo.")
            return True
        logger.warning(
            "market_telegram: risposta inattesa %s — %s",
            response.status_code,
            response.text[:300],
        )
        return False
    except httpx.TimeoutException:
        logger.warning("market_telegram: timeout nella richiesta.")
        return False
    except Exception as exc:
        logger.error("market_telegram: errore imprevisto — %s", exc)
        return False
