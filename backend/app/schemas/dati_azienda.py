from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
import re


def _validate_partita_iva(v: Optional[str]) -> Optional[str]:
    if v and not re.match(r"^IT\d{11}$", v):
        raise ValueError("Partita IVA non valida. Formato richiesto: IT + 11 cifre")
    return v


def _validate_email_field(v: Optional[str]) -> Optional[str]:
    if v and not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", v):
        raise ValueError("Email non valida")
    return v


def _validate_provincia(v: Optional[str]) -> Optional[str]:
    if v and not re.match(r"^[A-Za-z]{2}$", v):
        raise ValueError("Provincia deve essere di 2 lettere (es. MI, RM)")
    return v.upper() if v else v


def _validate_codice_sdi(v: Optional[str]) -> Optional[str]:
    if v and not re.match(r"^[A-Z0-9]{7}$", v, re.IGNORECASE):
        raise ValueError("Codice SDI deve essere di 7 caratteri alfanumerici")
    return v.upper() if v else v


class DatiAziendaBase(BaseModel):
    ragione_sociale: str
    partita_iva: str
    codice_fiscale: Optional[str] = None
    indirizzo: Optional[str] = None
    citta: Optional[str] = None
    cap: Optional[str] = None
    provincia: Optional[str] = None
    nazione: Optional[str] = "Italia"
    telefono: Optional[str] = None
    email: Optional[str] = None
    pec: Optional[str] = None
    sito_web: Optional[str] = None
    iban: Optional[str] = None
    codice_sdi: Optional[str] = None

    @field_validator("partita_iva")
    @classmethod
    def validate_partita_iva(cls, v: str) -> str:
        return _validate_partita_iva(v)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email_field(v)

    @field_validator("pec")
    @classmethod
    def validate_pec(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email_field(v)

    @field_validator("provincia")
    @classmethod
    def validate_provincia(cls, v: Optional[str]) -> Optional[str]:
        return _validate_provincia(v)

    @field_validator("codice_sdi")
    @classmethod
    def validate_codice_sdi(cls, v: Optional[str]) -> Optional[str]:
        return _validate_codice_sdi(v)


class DatiAziendaCreate(DatiAziendaBase):
    pass


class DatiAziendaUpdate(BaseModel):
    ragione_sociale: Optional[str] = None
    partita_iva: Optional[str] = None
    codice_fiscale: Optional[str] = None
    indirizzo: Optional[str] = None
    citta: Optional[str] = None
    cap: Optional[str] = None
    provincia: Optional[str] = None
    nazione: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    pec: Optional[str] = None
    sito_web: Optional[str] = None
    iban: Optional[str] = None
    codice_sdi: Optional[str] = None

    @field_validator("partita_iva")
    @classmethod
    def validate_partita_iva(cls, v: Optional[str]) -> Optional[str]:
        return _validate_partita_iva(v)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email_field(v)

    @field_validator("pec")
    @classmethod
    def validate_pec(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email_field(v)

    @field_validator("provincia")
    @classmethod
    def validate_provincia(cls, v: Optional[str]) -> Optional[str]:
        return _validate_provincia(v)

    @field_validator("codice_sdi")
    @classmethod
    def validate_codice_sdi(cls, v: Optional[str]) -> Optional[str]:
        return _validate_codice_sdi(v)


class DatiAziendaResponse(DatiAziendaBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
