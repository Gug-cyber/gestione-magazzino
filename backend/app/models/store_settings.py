from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime
from sqlalchemy.sql import func
from ..database import Base


class StoreSettings(Base):
    __tablename__ = "store_settings"

    id = Column(Integer, primary_key=True, index=True)

    # Identità portale
    store_nome = Column(String(100), default="TCG Store")
    store_logo_url = Column(String(500), nullable=True)

    # Metodi di spedizione
    spedizione_ritiro_abilitato = Column(Boolean, default=True)
    spedizione_ritiro_costo = Column(Float, default=0.0)
    spedizione_ritiro_giorni = Column(String(50), default="Immediato")

    spedizione_standard_abilitato = Column(Boolean, default=True)
    spedizione_standard_costo = Column(Float, default=4.90)
    spedizione_standard_giorni = Column(String(50), default="3-5 giorni lavorativi")

    spedizione_express_abilitato = Column(Boolean, default=True)
    spedizione_express_costo = Column(Float, default=9.90)
    spedizione_express_giorni = Column(String(50), default="1-2 giorni lavorativi")

    # Metodi di pagamento
    pagamento_carta_abilitato = Column(Boolean, default=True)
    pagamento_paypal_abilitato = Column(Boolean, default=True)
    pagamento_apple_pay_abilitato = Column(Boolean, default=True)
    pagamento_google_pay_abilitato = Column(Boolean, default=True)
    pagamento_negozio_abilitato = Column(Boolean, default=True)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
