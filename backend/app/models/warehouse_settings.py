from sqlalchemy import Column, Integer, Boolean, DateTime
from sqlalchemy.sql import func
from ..database import Base


class WarehouseSettings(Base):
    __tablename__ = "warehouse_settings"

    id = Column(Integer, primary_key=True, index=True)
    low_stock_threshold_default = Column(Integer, default=5)
    hide_zero_stock_products = Column(Boolean, default=False)
    show_purchase_price = Column(Boolean, default=False)
    show_margin = Column(Boolean, default=False)
    enable_auto_alerts = Column(Boolean, default=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
