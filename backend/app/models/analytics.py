import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from ..database import Base


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False, index=True)
    source = Column(String(100), nullable=False, default="direct", index=True)
    medium = Column(String(100), nullable=True)
    campaign = Column(String(255), nullable=True)
    referrer = Column(String(500), nullable=True)
    device = Column(String(20), nullable=False, default="desktop")
    order_id = Column(String(100), nullable=True)
    order_total = Column(Float, nullable=True)
    session_id = Column(String(100), nullable=True, index=True)
    page = Column(String(500), nullable=True)
    products = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
