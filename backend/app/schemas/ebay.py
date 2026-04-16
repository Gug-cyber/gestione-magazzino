from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class EbayConnectionStatus(BaseModel):
    connected: bool
    account_id: Optional[str]
    status: Optional[str]
    fee_percentage: Optional[float]
    marketplace_id: Optional[str]
    environment: Optional[str]


class EbayListingResponse(BaseModel):
    id: int
    product_id: int
    product_nome: str
    product_sku: str
    ebay_listing_id: Optional[str]
    status: str
    quantity_published: int
    published_price: Optional[float]
    expected_net_price: Optional[float]
    fee_percentage: Optional[float]
    last_sync_at: Optional[datetime]
    error_message: Optional[str]


class EbaySaleResponse(BaseModel):
    id: int
    product_id: Optional[int]
    ebay_order_id: str
    quantity_sold: int
    gross_amount: Optional[float]
    fee_amount: Optional[float]
    net_amount: Optional[float]
    sale_status: str
    sold_at: Optional[datetime]


class PublishRequest(BaseModel):
    product_id: int
    fee_override: Optional[float] = None
    quantity_override: Optional[int] = None
    shipping_cost: Optional[float] = 5.90
    force: bool = False
    ebay_category_id: Optional[str] = None
    listing_format: str = "FIXED_PRICE"
    auction_start_price: Optional[float] = None
    auction_duration: Optional[str] = None
    auction_reserve_price: Optional[float] = None
    auction_buy_it_now_price: Optional[float] = None


class PricingPreviewResponse(BaseModel):
    net_price: float
    fee_percentage: float
    published_price: float
    fee_amount: float


class ConnectionSettingsUpdate(BaseModel):
    fee_percentage: Optional[float] = None
    marketplace_id: Optional[str] = None
