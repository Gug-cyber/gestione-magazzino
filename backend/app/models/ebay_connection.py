from decimal import Decimal

from sqlalchemy import Column, DateTime, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class EbayConnection(Base):
    __tablename__ = "ebay_connections"

    id = Column(Integer, primary_key=True)
    ebay_account_id = Column(String(255), nullable=True)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=False)
    token_expires_at = Column(DateTime(timezone=True), nullable=False)
    refresh_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    environment = Column(String(20), default="PRODUCTION")
    status = Column(String(20), default="active")
    fee_percentage = Column(Numeric(5, 2), default=Decimal("13.25"))
    marketplace_id = Column(String(20), default="EBAY_IT")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    listings = relationship("EbayListing", back_populates="connection")
