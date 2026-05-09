from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class ManualListing(Base):
    __tablename__ = "manual_listings"
    __table_args__ = (
        UniqueConstraint("product_id", "platform", name="uq_manual_listings_product_platform"),
    )

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("prodotti.id", ondelete="CASCADE"), nullable=False, index=True)
    platform = Column(String(20), nullable=False, index=True)
    active = Column(Boolean, nullable=False, default=False)
    status = Column(String(30), nullable=False, default="non_pubblicare")
    platform_price = Column(Numeric(10, 2), nullable=True)
    listing_url = Column(String(500), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    sold_at = Column(DateTime(timezone=True), nullable=True)
    removed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    product = relationship("Prodotto", back_populates="manual_listings")
