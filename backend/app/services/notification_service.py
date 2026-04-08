"""
Notification service — supports multiple channels.
Currently implemented: Telegram Bot API (free, no billing required).

To add a new channel in the future:
1. Create a class implementing BaseNotificationChannel
2. Register it in NotificationService.channels
"""

import logging
import os
import httpx
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

_MARKDOWN_SPECIAL = str.maketrans({
    "_": r"\_",
    "*": r"\*",
    "[": r"\[",
    "`": r"\`",
})


def _escape_md(text: str) -> str:
    return text.translate(_MARKDOWN_SPECIAL)


class BaseNotificationChannel(ABC):
    @abstractmethod
    def send(self, subject: str, body: str) -> bool:
        ...


class TelegramChannel(BaseNotificationChannel):
    _BASE_URL = "https://api.telegram.org/bot{token}/sendMessage"

    def __init__(self):
        self.token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()

    @property
    def is_configured(self) -> bool:
        return bool(self.token and self.chat_id)

    def send(self, subject: str, body: str) -> bool:
        if not self.is_configured:
            logger.warning(
                "TelegramChannel: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set. Skipping."
            )
            return False
        url = self._BASE_URL.format(token=self.token)
        text = f"*{subject}*\n\n{body}"
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(url, json={
                    "chat_id": self.chat_id,
                    "text": text,
                    "parse_mode": "Markdown",
                })
            if response.status_code == 200:
                logger.info("TelegramChannel: notification sent successfully.")
                return True
            logger.warning(
                "TelegramChannel: unexpected response %s — %s",
                response.status_code,
                response.text[:300],
            )
            return False
        except httpx.TimeoutException:
            logger.warning("TelegramChannel: request timed out.")
            return False
        except Exception as exc:
            logger.error("TelegramChannel: unexpected error — %s", exc)
            return False


def _format_new_order_message(ordine) -> tuple:
    subject = f"Nuovo ordine: {ordine.numero_ordine}"
    num_articoli = sum(r.quantita for r in ordine.righe) if ordine.righe else 0
    ts = getattr(ordine, "data_ordine", None) or datetime.now(timezone.utc)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    data_ora = ts.strftime("%d/%m/%Y %H:%M UTC")
    cliente = _escape_md(ordine.cliente_nome or "N/D")
    admin_url = os.getenv("ADMIN_BASE_URL", "").strip()
    link_admin = f"\n🔗 [Vedi ordine in admin]({admin_url}/ordini/{ordine.id})" if admin_url else ""
    body = (
        f"📦 *Numero ordine:* `{ordine.numero_ordine}`\n"
        f"👤 *Cliente:* {cliente}\n"
        f"💰 *Totale:* €{ordine.totale:.2f}\n"
        f"📋 *Articoli:* {num_articoli} pz\n"
        f"🕐 *Data/ora:* {data_ora}"
        f"{link_admin}"
    )
    return subject, body


class NotificationService:
    def __init__(self):
        self.channels: list[BaseNotificationChannel] = [
            TelegramChannel(),
        ]

    def _broadcast(self, subject: str, body: str) -> None:
        for channel in self.channels:
            try:
                channel.send(subject, body)
            except Exception as exc:
                logger.error(
                    "NotificationService: error in channel %s — %s",
                    channel.__class__.__name__,
                    exc,
                )

    def send_new_order_notification(self, ordine) -> None:
        try:
            subject, body = _format_new_order_message(ordine)
            self._broadcast(subject, body)
        except Exception as exc:
            logger.error(
                "NotificationService.send_new_order_notification: unexpected error — %s", exc
            )


notification_service = NotificationService()
