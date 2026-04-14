from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class EbaySale(Base):
    __tablename__ = "ebay_sales"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("prodotti.id", ondelete="SET NULL"), nullable=True)
    listing_id = Column(Integer, ForeignKey("ebay_listings.id", ondelete="SET NULL"), nullable=True)
    ebay_order_id = Column(String(255), nullable=False, unique=True, index=True)
    quantity_sold = Column(Integer, nullable=False, default=1)
    gross_amount = Column(Numeric(10, 2), nullable=True)
    fee_amount = Column(Numeric(10, 2), nullable=True)
    net_amount = Column(Numeric(10, 2), nullable=True)
    sale_status = Column(String(30), default="completed")
    sold_at = Column(DateTime(timezone=True), nullable=True)
    synced_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    listing = relationship("EbayListing", back_populates="sales")
