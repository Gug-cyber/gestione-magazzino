"""Router per i endpoint REST Market Intelligence.

Endpoint:
  GET /api/market-intelligence/report-prezzi   — ultimi N report giornalieri
  GET /api/market-intelligence/occasioni        — ultime occasioni trovate
  GET /api/market-intelligence/status           — stato scheduler

Tutti protetti da autenticazione.
"""
import logging
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
