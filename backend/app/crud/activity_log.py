from sqlalchemy.orm import Session
from ..models.activity_log import ActivityLog


def log_activity(
    db: Session,
    azione: str,
    utente_id=None,
    username=None,
    entita=None,
    entita_id=None,
    dettagli=None,
    ip_address=None,
):
    try:
        entry = ActivityLog(
            utente_id=utente_id,
            username=username,
            azione=azione,
            entita=entita,
            entita_id=entita_id,
            dettagli=dettagli,
            ip_address=ip_address,
        )
        db.add(entry)
        db.commit()
    except Exception:
        db.rollback()


def get_logs(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    utente_id: int = None,
    azione: str = None,
):
    q = db.query(ActivityLog)
    if utente_id:
        q = q.filter(ActivityLog.utente_id == utente_id)
    if azione:
        q = q.filter(ActivityLog.azione.ilike(f"%{azione}%"))
    total = q.count()
    items = q.order_by(ActivityLog.eseguito_il.desc()).offset(skip).limit(limit).all()
    return items, total
