import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "")
try:
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
except (ValueError, TypeError):
    SMTP_PORT = 587
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)
EMAIL_ENABLED = bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def send_email(to: str, subject: str, body_html: str) -> bool:
    """
    Invia una email via SMTP. Ritorna True se inviata, False se SMTP non configurato.
    Non solleva eccezioni: logga l'errore e ritorna False.
    """
    if not EMAIL_ENABLED:
        logger.info(f"[EMAIL DISABLED] To: {to} | Subject: {subject}")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to
        msg.attach(MIMEText(body_html, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [to], msg.as_string())
        return True
    except Exception as e:
        logger.error(f"Errore invio email a {to}: {e}")
        return False


def send_forgot_username_email(to: str, username: str) -> bool:
    subject = "Gestione Magazzino — Recupero Username"
    body = f"""
    <p>Ciao,</p>
    <p>il tuo username per accedere a <strong>Gestione Magazzino</strong> è:</p>
    <h2 style="color:#1a237e">{username}</h2>
    <p>Se non hai richiesto questa informazione, ignora questa email.</p>
    """
    return send_email(to, subject, body)


def send_reset_password_email(to: str, token: str, reset_url: str) -> bool:
    subject = "Gestione Magazzino — Reset Password"
    body = f"""
    <p>Ciao,</p>
    <p>hai richiesto il reset della password per <strong>Gestione Magazzino</strong>.</p>
    <p>Clicca il link qui sotto per reimpostare la tua password (scade tra 30 minuti):</p>
    <p><a href="{reset_url}" style="background:#1a237e;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Reimposta Password 🔑</a></p>
    <p>Oppure copia questo link nel browser:</p>
    <pre style="background:#e8eaf6;padding:8px;border-radius:4px;word-break:break-all">{reset_url}</pre>
    <p>Se non hai richiesto il reset, ignora questa email.</p>
    """
    return send_email(to, subject, body)
