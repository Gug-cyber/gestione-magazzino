import json
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.analytics import AnalyticsEvent
from ..models.prodotto import Prodotto
from ..auth import get_current_active_user
from ..limiter import limiter

router = APIRouter()

VALID_SOURCES = {"instagram", "facebook", "tiktok", "google", "bing", "yahoo", "direct", "ebay", "other"}
VALID_EVENT_TYPES = {"page_view", "purchase", "add_to_cart", "checkout_start"}
VALID_DEVICES = {"mobile", "desktop"}


def _normalize_source(source: Optional[str]) -> str:
    if not source:
        return "direct"
    s = source.lower().strip()
    if s in VALID_SOURCES:
        return s
    return "other"


def _normalize_device(device: Optional[str]) -> str:
    if not device:
        return "desktop"
    d = device.lower().strip()
    return d if d in VALID_DEVICES else "desktop"


def _date_range(period: str):
    now = datetime.utcnow()
    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "7d":
        start = now - timedelta(days=7)
    elif period == "30d":
        start = now - timedelta(days=30)
    elif period == "current_month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "current_year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now - timedelta(days=30)
    return start, now


# ---------------------------------------------------------------------------
# POST /api/analytics/event — public, no auth, rate-limited
# ---------------------------------------------------------------------------

@router.post("/event", status_code=201)
@limiter.limit("60/minute")
async def track_event(request: Request, db: Session = Depends(get_db)):
    """Receive and store an analytics event from the store frontend."""
    try:
        body = await request.json()
    except Exception:
        return {"ok": False, "error": "Invalid JSON"}

    event_type = body.get("event_type", "")
    if event_type not in VALID_EVENT_TYPES:
        return {"ok": False, "error": "Invalid event_type"}

    # Validate products JSON if present
    products_raw = body.get("products")
    products_str = None
    if products_raw is not None:
        try:
            products_str = json.dumps(products_raw)[:2000]
        except Exception:
            products_str = None

    order_total = body.get("order_total")
    if order_total is not None:
        try:
            order_total = float(order_total)
            if order_total < 0 or order_total > 1_000_000:
                order_total = None
        except (TypeError, ValueError):
            order_total = None

    event = AnalyticsEvent(
        event_type=event_type,
        source=_normalize_source(body.get("source")),
        medium=str(body.get("medium", "") or "")[:100] or None,
        campaign=str(body.get("campaign", "") or "")[:255] or None,
        referrer=str(body.get("referrer", "") or "")[:500] or None,
        device=_normalize_device(body.get("device")),
        order_id=str(body.get("order_id", "") or "")[:100] or None,
        order_total=order_total,
        session_id=str(body.get("session_id", "") or "")[:100] or None,
        page=str(body.get("page", "") or "")[:500] or None,
        products=products_str,
    )
    db.add(event)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# GET /api/analytics/summary — requires auth
# ---------------------------------------------------------------------------

@router.get("/summary")
def get_summary(
    period: str = Query(default="30d", pattern="^(today|7d|30d|current_month|current_year)$"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    start, end = _date_range(period)

    q_base = db.query(AnalyticsEvent).filter(
        AnalyticsEvent.created_at >= start,
        AnalyticsEvent.created_at <= end,
    )

    # Unique visitors (distinct session_id for page_view events)
    unique_visitors = (
        q_base.filter(AnalyticsEvent.event_type == "page_view")
        .with_entities(func.count(distinct(AnalyticsEvent.session_id)))
        .scalar()
        or 0
    )

    # Total sessions
    total_sessions = (
        q_base.filter(AnalyticsEvent.event_type == "page_view")
        .with_entities(func.count(AnalyticsEvent.id))
        .scalar()
        or 0
    )

    # Purchase events
    purchases = (
        q_base.filter(AnalyticsEvent.event_type == "purchase").all()
    )
    total_orders = len(purchases)
    total_revenue = sum(float(p.order_total or 0) for p in purchases)
    avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
    conversion_rate = (total_orders / total_sessions * 100) if total_sessions > 0 else 0

    # Per-channel breakdown
    all_sources = ["instagram", "facebook", "tiktok", "google", "direct", "other"]
    channels = []
    for source in all_sources:
        visits = (
            q_base.filter(
                AnalyticsEvent.event_type == "page_view",
                AnalyticsEvent.source == source,
            ).count()
        )
        channel_purchases = [p for p in purchases if p.source == source]
        ch_orders = len(channel_purchases)
        ch_revenue = sum(float(p.order_total or 0) for p in channel_purchases)
        ch_aov = ch_revenue / ch_orders if ch_orders > 0 else 0
        ch_cr = (ch_orders / visits * 100) if visits > 0 else 0
        channels.append(
            {
                "source": source,
                "visits": visits,
                "orders": ch_orders,
                "revenue": round(ch_revenue, 2),
                "conversion_rate": round(ch_cr, 2),
                "avg_order_value": round(ch_aov, 2),
            }
        )

    # Daily trend
    daily_trend = _daily_trend(db, start, end)

    return {
        "period": period,
        "unique_visitors": unique_visitors,
        "total_sessions": total_sessions,
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "avg_order_value": round(avg_order_value, 2),
        "conversion_rate": round(conversion_rate, 2),
        "channels": channels,
        "daily_trend": daily_trend,
    }


def _daily_trend(db: Session, start: datetime, end: datetime):
    events = (
        db.query(AnalyticsEvent)
        .filter(AnalyticsEvent.created_at >= start, AnalyticsEvent.created_at <= end)
        .filter(AnalyticsEvent.event_type.in_(["page_view", "purchase"]))
        .all()
    )

    days: dict = {}
    for ev in events:
        day = ev.created_at.strftime("%Y-%m-%d")
        if day not in days:
            days[day] = {"date": day, "visits": 0, "orders": 0, "revenue": 0.0}
        if ev.event_type == "page_view":
            days[day]["visits"] += 1
        elif ev.event_type == "purchase":
            days[day]["orders"] += 1
            days[day]["revenue"] += float(ev.order_total or 0)

    result = sorted(days.values(), key=lambda x: x["date"])
    for d in result:
        d["revenue"] = round(d["revenue"], 2)
    return result


# ---------------------------------------------------------------------------
# GET /api/analytics/top-products — requires auth
# ---------------------------------------------------------------------------

@router.get("/top-products")
def get_top_products(
    period: str = Query(default="30d", pattern="^(today|7d|30d|current_month|current_year)$"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    start, end = _date_range(period)

    purchases = (
        db.query(AnalyticsEvent)
        .filter(
            AnalyticsEvent.event_type == "purchase",
            AnalyticsEvent.created_at >= start,
            AnalyticsEvent.created_at <= end,
            AnalyticsEvent.products.isnot(None),
        )
        .all()
    )

    sold: dict = {}
    for p in purchases:
        try:
            items = json.loads(p.products or "[]")
            for item in items:
                pid = str(item.get("id", ""))
                pname = str(item.get("name", item.get("nome", pid)))
                qty = int(item.get("quantity", item.get("quantita", 1)))
                revenue = float(item.get("price", item.get("prezzo", 0))) * qty
                if pid:
                    if pid not in sold:
                        sold[pid] = {"id": pid, "name": pname, "quantity": 0, "revenue": 0.0}
                    sold[pid]["quantity"] += qty
                    sold[pid]["revenue"] += revenue
        except Exception:
            continue

    top_sold = sorted(sold.values(), key=lambda x: x["quantity"], reverse=True)[:10]
    for item in top_sold:
        item["revenue"] = round(item["revenue"], 2)

    # Add to cart counts
    add_to_cart_events = (
        db.query(AnalyticsEvent)
        .filter(
            AnalyticsEvent.event_type == "add_to_cart",
            AnalyticsEvent.created_at >= start,
            AnalyticsEvent.created_at <= end,
        )
        .count()
    )

    purchase_count = len(purchases)
    cart_abandonment_rate = (
        round((1 - purchase_count / add_to_cart_events) * 100, 1)
        if add_to_cart_events > 0
        else 0
    )

    return {
        "top_sold": top_sold,
        "add_to_cart_count": add_to_cart_events,
        "purchase_count": purchase_count,
        "cart_abandonment_rate": cart_abandonment_rate,
    }


# ---------------------------------------------------------------------------
# GET /api/analytics/devices — requires auth
# ---------------------------------------------------------------------------

@router.get("/devices")
def get_devices(
    period: str = Query(default="30d", pattern="^(today|7d|30d|current_month|current_year)$"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    start, end = _date_range(period)

    rows = (
        db.query(AnalyticsEvent.device, func.count(AnalyticsEvent.id).label("count"))
        .filter(
            AnalyticsEvent.event_type == "page_view",
            AnalyticsEvent.created_at >= start,
            AnalyticsEvent.created_at <= end,
        )
        .group_by(AnalyticsEvent.device)
        .all()
    )

    total = sum(r.count for r in rows)
    result = [
        {
            "device": r.device,
            "count": r.count,
            "percentage": round(r.count / total * 100, 1) if total > 0 else 0,
        }
        for r in rows
    ]

    mobile = next((r["count"] for r in result if r["device"] == "mobile"), 0)
    desktop = next((r["count"] for r in result if r["device"] == "desktop"), 0)

    return {
        "total": total,
        "mobile": mobile,
        "desktop": desktop,
        "mobile_pct": round(mobile / total * 100, 1) if total > 0 else 0,
        "desktop_pct": round(desktop / total * 100, 1) if total > 0 else 0,
        "breakdown": result,
    }
