from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String
from sqlalchemy.sql import func

from ..database import Base


class MarketReport(Base):
    __tablename__ = "market_reports"

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime(timezone=True), default=func.now())
    report_type = Column(String)  # "daily_price" o "scout_opportunity"
    data = Column(JSON)  # dati del report
    sent_telegram = Column(Boolean, default=False)
