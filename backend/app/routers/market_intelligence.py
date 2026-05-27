"""Router per gli endpoint REST Market Intelligence.

Endpoint:
  GET /api/market-intelligence/report-prezzi   — ultimi N report giornalieri
  GET /api/market-intelligence/occasioni        — ultime occasioni trovate
  GET /api/market-intelligence/status           — stato scheduler

Tutti protetti da autenticazione.
"""
import logging
import os
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..auth import get_current_active_user
from ..database import get_db
from ..models.market_report import MarketReport

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/market-intelligence", tags=["Market Intelligence"])


@router.get("/report-prezzi")
def get_report_prezzi(
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
) -> dict[str, Any]:
    """Restituisce gli ultimi N report giornalieri prezzi."""
    reports = (
        db.query(MarketReport)
        .filter(MarketReport.report_type == "daily_price")
        .order_by(MarketReport.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "totale": len(reports),
        "reports": [
            {
                "id": r.id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "sent_telegram": r.sent_telegram,
                "data": r.data,
            }
            for r in reports
        ],
    }


@router.get("/occasioni")
def get_occasioni(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
) -> dict[str, Any]:
    """Restituisce le ultime occasioni di scouting trovate."""
    reports = (
        db.query(MarketReport)
        .filter(MarketReport.report_type == "scout_opportunity")
        .order_by(MarketReport.created_at.desc())
        .limit(limit)
        .all()
    )

    occasioni: list[dict[str, Any]] = []
    for r in reports:
        data = r.data or {}
        for occ in data.get("occasioni", []):
            occasioni.append({
                "report_id": r.id,
                "report_created_at": r.created_at.isoformat() if r.created_at else None,
                **occ,
            })

    return {
        "totale": len(occasioni),
        "occasioni": occasioni,
    }


@router.get("/status")
def get_status(
    current_user=Depends(get_current_active_user),
) -> dict[str, Any]:
    """Restituisce lo stato degli scheduler di market intelligence."""
    try:
        from ..tasks.market_price_scheduler import get_scheduler_status as price_status
        price_info = price_status()
    except Exception:
        logger.warning("Impossibile recuperare status market_price")
        price_info = {"error": "scheduler non disponibile"}

    try:
        from ..tasks.market_scout_scheduler import get_scheduler_status as scout_status
        scout_info = scout_status()
    except Exception:
        logger.warning("Impossibile recuperare status market_scout")
        scout_info = {"error": "scheduler non disponibile"}

    return {
        "market_price_scheduler": price_info,
        "market_scout_scheduler": scout_info,
    }


@router.post("/trigger/report-prezzi")
def trigger_report_prezzi(
    current_user=Depends(get_current_active_user),
) -> dict[str, Any]:
    """Esegue manualmente il report giornaliero prezzi (per test/debug)."""
    from ..tasks.market_price_scheduler import run_daily_price_report
    result = run_daily_price_report()
    if "error" in result:
        return {"triggered": True, "success": False, "message": "Report non completato, controllare i log."}
    return {
        "triggered": True,
        "success": True,
        "in_linea": int(result.get("in_linea") or 0),
        "sopra_mercato": int(result.get("sopra_mercato") or 0),
        "sotto_mercato": int(result.get("sotto_mercato") or 0),
        "totale_prodotti": int(result.get("totale_prodotti") or 0),
    }


@router.post("/trigger/scout")
def trigger_scout(
    current_user=Depends(get_current_active_user),
) -> dict[str, Any]:
    """Esegue manualmente lo scouting occasioni (per test/debug)."""
    from ..tasks.market_scout_scheduler import run_market_scout
    result = run_market_scout()
    if "error" in result:
        return {"triggered": True, "success": False, "message": "Scout non completato, controllare i log."}
    return {
        "triggered": True,
        "success": True,
        "occasioni_trovate": int(result.get("totale") or 0),
    }


@router.post("/test-telegram")
def test_telegram(
    current_user=Depends(get_current_active_user),
) -> dict[str, Any]:
    """Testa la configurazione Telegram per entrambi i canali."""
    from ..services.market_telegram import send_market_message
    from ..services.notification_service import TelegramChannel

    ordini_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    ordini_chat = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    ordini_channel = TelegramChannel()
    ordini_configured = ordini_channel.is_configured
    ordini_sent = False
    if ordini_configured:
        ordini_sent = ordini_channel.send(
            "Test canale ordini",
            "✅ Canale ordini Telegram configurato correttamente.",
        )

    market_token = os.getenv("MARKET_BOT_TOKEN", "").strip()
    market_chat = os.getenv("MARKET_CHAT_ID", "").strip()
    market_configured = bool(market_token and market_chat)
    market_sent = False
    if market_configured:
        market_sent = send_market_message(
            "✅ Canale market intelligence Telegram configurato correttamente."
        )

    return {
        "canale_ordini": {
            "configurato": ordini_configured,
            "TELEGRAM_BOT_TOKEN": "impostato" if ordini_token else "mancante",
            "TELEGRAM_CHAT_ID": "impostato" if ordini_chat else "mancante",
            "messaggio_inviato": ordini_sent,
        },
        "canale_market": {
            "configurato": market_configured,
            "MARKET_BOT_TOKEN": "impostato" if market_token else "mancante",
            "MARKET_CHAT_ID": "impostato" if market_chat else "mancante",
            "messaggio_inviato": market_sent,
        },
    }


@router.get("/test-groq")
def test_groq(
    current_user=Depends(get_current_active_user),
) -> dict[str, Any]:
    """Testa la configurazione AI (Groq o Ollama)."""
    groq_key = os.getenv("GROQ_API_KEY", "").strip()

    try:
        from ..services.llm_service import LLMService

        svc = LLMService()
        risposta = svc.chat("Rispondi solo con: OK", system="Sei un test.")
        return {
            "ai_disponibile": True,
            "backend": "groq" if groq_key else "ollama",
            "GROQ_API_KEY": "impostata" if groq_key else "mancante (usa Ollama locale)",
            "risposta_test": risposta[:100],
        }
    except Exception as exc:
        logger.warning("Test AI non riuscito su backend %s: %s", "groq" if groq_key else "ollama", exc)
        return {
            "ai_disponibile": False,
            "backend": "groq" if groq_key else "ollama",
            "GROQ_API_KEY": "impostata" if groq_key else "mancante (usa Ollama locale)",
            "errore": "Servizio AI non disponibile o configurazione non valida.",
        }
