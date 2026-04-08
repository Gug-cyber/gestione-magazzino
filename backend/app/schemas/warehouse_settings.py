from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class WarehouseSettingsResponse(BaseModel):
    low_stock_threshold_default: int
    hide_zero_stock_products: bool
    show_purchase_price: bool
    show_margin: bool
    enable_auto_alerts: bool
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WarehouseSettingsUpdate(BaseModel):
    low_stock_threshold_default: Optional[int] = None
    hide_zero_stock_products: Optional[bool] = None
    show_purchase_price: Optional[bool] = None
    show_margin: Optional[bool] = None
    enable_auto_alerts: Optional[bool] = None
