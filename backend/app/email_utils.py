import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import resend

logger = logging.getLogger(__name__)

# --- Resend configuration ---
resend.api_key = os.getenv("RESEND_API_KEY", "")
RESEND_ENABLED = bool(resend.api_key)
RESEND_FROM = os.getenv("RESEND_FROM", "Gestione Magazzino <onboarding@resend.dev>")

# --- SMTP fallback configuration ---
SMTP_HOST = os.getenv("SMTP_HOST", "")
try:
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
except (ValueError, TypeError):
    SMTP_PORT = 587
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)
SMTP_ENABLED = bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def _send_email_resend(to: str, subject: str, body_html: str) -> bool:
    try:
        params = {
            "from": RESEND_FROM,
            "to": [to],
            "subject": subject,
            "html": body_html,
        }
        resend.Emails.send(params)
        logger.info(f"[RESEND] Email inviata a {to} | Subject: {subject}")
        return True
    except Exception as e:
        logger.error(f"Errore Resend a {to}: {e}")
        return False


def _send_email_smtp(to: str, subject: str, body_html: str) -> bool:
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
        logger.info(f"[SMTP] Email inviata a {to} | Subject: {subject}")
        return True
    except Exception as e:
        logger.error(f"Errore invio email a {to}: {e}")
        return False


def send_email(to: str, subject: str, body_html: str) -> bool:
    """
    Invia una email. Usa Resend se RESEND_API_KEY è configurata, altrimenti SMTP.
    Ritorna True se inviata, False altrimenti.
    Non solleva eccezioni: logga l'errore e ritorna False.
    """
    if RESEND_ENABLED:
        return _send_email_resend(to, subject, body_html)
    if SMTP_ENABLED:
        return _send_email_smtp(to, subject, body_html)
    logger.info(f"[EMAIL DISABLED] To: {to} | Subject: {subject}")
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
