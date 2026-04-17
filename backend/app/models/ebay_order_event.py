from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.sql import func

from ..database import Base


class EbayOrderEvent(Base):
    """Tabella per tracciare eventi eBay già processati (idempotenza)."""

    __tablename__ = "ebay_order_events"

    id = Column(Integer, primary_key=True, index=True)
    ebay_order_id = Column(String(255), nullable=False, unique=True, index=True)
    sku = Column(String(255), nullable=True)
    quantity = Column(Integer, nullable=True)
    processed_at = Column(DateTime(timezone=True), server_default=func.now())
