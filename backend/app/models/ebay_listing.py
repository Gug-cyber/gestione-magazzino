from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class EbayListing(Base):
    __tablename__ = "ebay_listings"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("prodotti.id", ondelete="CASCADE"), nullable=False)
    connection_id = Column(Integer, ForeignKey("ebay_connections.id", ondelete="CASCADE"), nullable=False)
    ebay_item_id = Column(String(255), nullable=True)
    ebay_offer_id = Column(String(255), nullable=True)
    ebay_listing_id = Column(String(255), nullable=True, index=True)
    status = Column(String(30), default="draft")
    quantity_published = Column(Integer, default=0)
    published_price = Column(Numeric(10, 2), nullable=True)
    expected_net_price = Column(Numeric(10, 2), nullable=True)
    fee_percentage = Column(Numeric(5, 2), nullable=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    product = relationship("Prodotto", backref="ebay_listings")
    connection = relationship("EbayConnection", back_populates="listings")
    sales = relationship("EbaySale", back_populates="listing")
