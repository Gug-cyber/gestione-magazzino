from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StoreSettingsResponse(BaseModel):
    store_nome: str
    store_logo_url: Optional[str] = None
    store_sfondo_url: Optional[str] = None
    spedizione_ritiro_abilitato: bool
    spedizione_ritiro_costo: float
    spedizione_ritiro_giorni: str
    spedizione_standard_abilitato: bool
    spedizione_standard_costo: float
    spedizione_standard_giorni: str
    spedizione_express_abilitato: bool
    spedizione_express_costo: float
    spedizione_express_giorni: str
    pagamento_carta_abilitato: bool
    pagamento_paypal_abilitato: bool
    pagamento_apple_pay_abilitato: bool
    pagamento_google_pay_abilitato: bool
    pagamento_negozio_abilitato: bool
    social_facebook_url: Optional[str] = None
    social_instagram_url: Optional[str] = None
    social_tiktok_url: Optional[str] = None
    social_twitch_url: Optional[str] = None
    social_youtube_url: Optional[str] = None
    social_ebay_url: Optional[str] = None
    footer_font_family: Optional[str] = None
    footer_font_size: Optional[int] = None
    footer_text_color: Optional[str] = None
    footer_bg_color: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StoreSettingsPublicResponse(BaseModel):
    """Schema per l'endpoint pubblico: omette updated_at per non esporre timing admin."""
    store_nome: str
    store_logo_url: Optional[str] = None
    store_sfondo_url: Optional[str] = None
    spedizione_ritiro_abilitato: bool
    spedizione_ritiro_costo: float
    spedizione_ritiro_giorni: str
    spedizione_standard_abilitato: bool
    spedizione_standard_costo: float
    spedizione_standard_giorni: str
    spedizione_express_abilitato: bool
    spedizione_express_costo: float
    spedizione_express_giorni: str
    pagamento_carta_abilitato: bool
    pagamento_paypal_abilitato: bool
    pagamento_apple_pay_abilitato: bool
    pagamento_google_pay_abilitato: bool
    pagamento_negozio_abilitato: bool
    social_facebook_url: Optional[str] = None
    social_instagram_url: Optional[str] = None
    social_tiktok_url: Optional[str] = None
    social_twitch_url: Optional[str] = None
    social_youtube_url: Optional[str] = None
    social_ebay_url: Optional[str] = None
    footer_font_family: Optional[str] = None
    footer_font_size: Optional[int] = None
    footer_text_color: Optional[str] = None
    footer_bg_color: Optional[str] = None

    class Config:
        from_attributes = True


class StoreSettingsUpdate(BaseModel):
    store_nome: Optional[str] = None
    store_logo_url: Optional[str] = None
    store_sfondo_url: Optional[str] = None
    spedizione_ritiro_abilitato: Optional[bool] = None
    spedizione_ritiro_costo: Optional[float] = None
    spedizione_ritiro_giorni: Optional[str] = None
    spedizione_standard_abilitato: Optional[bool] = None
    spedizione_standard_costo: Optional[float] = None
    spedizione_standard_giorni: Optional[str] = None
    spedizione_express_abilitato: Optional[bool] = None
    spedizione_express_costo: Optional[float] = None
    spedizione_express_giorni: Optional[str] = None
    pagamento_carta_abilitato: Optional[bool] = None
    pagamento_paypal_abilitato: Optional[bool] = None
    pagamento_apple_pay_abilitato: Optional[bool] = None
    pagamento_google_pay_abilitato: Optional[bool] = None
    pagamento_negozio_abilitato: Optional[bool] = None
    social_facebook_url: Optional[str] = None
    social_instagram_url: Optional[str] = None
    social_tiktok_url: Optional[str] = None
    social_twitch_url: Optional[str] = None
    social_youtube_url: Optional[str] = None
    social_ebay_url: Optional[str] = None
    footer_font_family: Optional[str] = None
    footer_font_size: Optional[int] = None
    footer_text_color: Optional[str] = None
    footer_bg_color: Optional[str] = None
