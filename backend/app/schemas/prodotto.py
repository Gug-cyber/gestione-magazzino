from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional, Literal
from decimal import Decimal
from datetime import datetime
from urllib.parse import urlparse


MANUAL_LISTING_PLATFORMS = ("vinted", "wallapop")
MANUAL_LISTING_STATUSES = (
    "non_pubblicare",
    "da_pubblicare",
    "pubblicato",
    "venduto",
    "rimosso",
    "da_controllare",
)


class ManualListingBase(BaseModel):
    platform: Literal["vinted", "wallapop"]
    active: bool = False
    status: Optional[Literal["non_pubblicare", "da_pubblicare", "pubblicato", "venduto", "rimosso", "da_controllare"]] = None
    platform_price: Optional[Decimal] = None
    listing_url: Optional[str] = None
    published_at: Optional[datetime] = None
    sold_at: Optional[datetime] = None
    removed_at: Optional[datetime] = None
    notes: Optional[str] = None

    @field_validator("platform_price")
    @classmethod
    def platform_price_non_negativo(cls, v):
        if v is not None and v < 0:
            raise ValueError("Il prezzo piattaforma non può essere negativo")
        return v

    @field_validator("listing_url")
    @classmethod
    def valid_listing_url(cls, v):
        if v is None:
            return None
        value = v.strip()
        if value == "":
            return None
        parsed = urlparse(value)
        if parsed.scheme != "https" or not parsed.netloc:
            raise ValueError("URL annuncio non valido")
        return value

    @field_validator("notes")
    @classmethod
    def empty_notes_to_none(cls, v):
        if v is None:
            return None
        value = v.strip()
        return value or None

    @model_validator(mode="after")
    def normalize_status(self):
        if self.active and not self.status:
            self.status = "da_pubblicare"
        if not self.active and not self.status:
            self.status = "non_pubblicare"
        return self


class ManualListingCreate(ManualListingBase):
    pass


class ManualListingUpdate(ManualListingBase):
    id: Optional[int] = None


class ManualListingResponse(ManualListingBase):
    id: int
    product_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProdottoBase(BaseModel):
    nome: str
    descrizione: Optional[str] = None
    sku: str
    quantita: int = 0
    quantita_minima: int = 0
    prezzo_acquisto: Optional[Decimal] = None
    prezzo_vendita: Optional[Decimal] = None
    categoria_id: Optional[int] = None
    ubicazione_id: Optional[int] = None
    stato_conservazione: Optional[str] = None
    lingua: Optional[str] = None
    gioco: Optional[str] = None
    foto_path: Optional[str] = None
    barcode: Optional[str] = None
    cardtrader_blueprint_id: Optional[int] = None
    google_drive_folder_id: Optional[str] = None
    su_vinted: bool = False
    su_wallapop: bool = False
    non_vendibile: bool = False
    manual_listings: Optional[List[ManualListingCreate]] = None

    @field_validator("barcode")
    @classmethod
    def empty_barcode_to_none(cls, v):
        if v is not None and v.strip() == '':
            return None
        return v

    @field_validator("quantita", "quantita_minima")
    @classmethod
    def quantita_non_negativa(cls, v):
        if v is not None and v < 0:
            raise ValueError("La quantità non può essere negativa")
        return v

    @field_validator("prezzo_acquisto", "prezzo_vendita")
    @classmethod
    def prezzo_non_negativo(cls, v):
        if v is not None and v < 0:
            raise ValueError("Il prezzo non può essere negativo")
        return v


class ProdottoCreate(ProdottoBase):
    pass


class ProdottoUpdate(BaseModel):
    nome: Optional[str] = None
    descrizione: Optional[str] = None
    sku: Optional[str] = None
    quantita: Optional[int] = None
    quantita_minima: Optional[int] = None
    prezzo_acquisto: Optional[Decimal] = None
    prezzo_vendita: Optional[Decimal] = None
    categoria_id: Optional[int] = None
    ubicazione_id: Optional[int] = None
    stato_conservazione: Optional[str] = None
    lingua: Optional[str] = None
    gioco: Optional[str] = None
    barcode: Optional[str] = None
    cardtrader_blueprint_id: Optional[int] = None
    google_drive_folder_id: Optional[str] = None
    su_vinted: Optional[bool] = None
    su_wallapop: Optional[bool] = None
    non_vendibile: Optional[bool] = None
    manual_listings: Optional[List[ManualListingUpdate]] = None


class ProdottoResponse(ProdottoBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    foto_url: Optional[str] = None
    foto_aggiuntive: Optional[List[str]] = None
    barcode_generated_at: Optional[datetime] = None
    immagini_drive: Optional[List[str]] = None
    manual_listings: List[ManualListingResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True
