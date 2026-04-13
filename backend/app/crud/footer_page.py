from sqlalchemy.orm import Session
from ..models.footer_page import FooterPage
from ..schemas.footer_page import FooterPageCreate, FooterPageUpdate


DEFAULT_FOOTER_PAGES = [
    # Informative
    {"slug": "termini-e-condizioni", "titolo": "Termini e Condizioni d'Uso", "sezione": "informative", "ordine": 1},
    {"slug": "pagamento-sicuro", "titolo": "Pagamento Sicuro", "sezione": "informative", "ordine": 2},
    {"slug": "prevendite", "titolo": "Prevendite", "sezione": "informative", "ordine": 3},
    {"slug": "resi-e-spedizioni", "titolo": "Resi e Spedizioni", "sezione": "informative", "ordine": 4},
    {"slug": "privacy-policy", "titolo": "Privacy Policy", "sezione": "informative", "ordine": 5},
    {"slug": "cookie-policy", "titolo": "Cookie Policy", "sezione": "informative", "ordine": 6},
    # Scopri
    {"slug": "chi-siamo", "titolo": "Chi siamo", "sezione": "scopri", "ordine": 1},
    {"slug": "contatti", "titolo": "Contatti", "sezione": "scopri", "ordine": 2},
    {"slug": "lavora-con-noi", "titolo": "Lavora con Noi", "sezione": "scopri", "ordine": 3},
    {"slug": "il-nostro-blog", "titolo": "Il nostro blog", "sezione": "scopri", "ordine": 4},
    # Account
    {"slug": "il-tuo-account", "titolo": "Il tuo account", "sezione": "account", "ordine": 1},
    {"slug": "i-tuoi-ordini", "titolo": "I tuoi ordini", "sezione": "account", "ordine": 2},
    {"slug": "diventa-vnp", "titolo": "Diventa VNP", "sezione": "account", "ordine": 3},
    {"slug": "vendici-le-tue-carte", "titolo": "Vendici le tue carte!", "sezione": "account", "ordine": 4},
    # Servizio
    {"slug": "faq", "titolo": "FAQs - Domande Frequenti", "sezione": "servizio", "ordine": 1},
    {"slug": "maggiori-informazioni", "titolo": "Maggiori informazioni", "sezione": "servizio", "ordine": 2},
]


def seed_default_pages(db: Session) -> None:
    """Popola le footer_pages con le voci di default se non esistono."""
    for page_data in DEFAULT_FOOTER_PAGES:
        existing = db.query(FooterPage).filter(FooterPage.slug == page_data["slug"]).first()
        if not existing:
            db.add(FooterPage(**page_data))
    db.commit()


def get_all_pages(db: Session):
    return db.query(FooterPage).order_by(FooterPage.sezione, FooterPage.ordine).all()


def get_enabled_pages(db: Session):
    return (
        db.query(FooterPage)
        .filter(FooterPage.abilitato == True)  # noqa: E712
        .order_by(FooterPage.sezione, FooterPage.ordine)
        .all()
    )


def get_page_by_slug(db: Session, slug: str):
    return db.query(FooterPage).filter(FooterPage.slug == slug).first()


def upsert_page(db: Session, slug: str, data: FooterPageUpdate):
    page = db.query(FooterPage).filter(FooterPage.slug == slug).first()
    if page:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(page, key, value)
        db.commit()
        db.refresh(page)
        return page
    return None


def create_page(db: Session, data: FooterPageCreate):
    page = FooterPage(**data.model_dump())
    db.add(page)
    db.commit()
    db.refresh(page)
    return page


def delete_page(db: Session, slug: str) -> bool:
    page = db.query(FooterPage).filter(FooterPage.slug == slug).first()
    if not page:
        return False
    db.delete(page)
    db.commit()
    return True
