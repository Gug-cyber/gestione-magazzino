"""
Servizio per il tracking automatico delle spedizioni Poste Italiane.
Utilizza l'API JSON pubblica di Poste Italiane per recuperare lo stato delle spedizioni.
"""
import requests
from typing import Optional, Dict, List
from datetime import datetime
import logging
import time

logger = logging.getLogger(__name__)


class PosteTrackingService:
    """Servizio per tracking spedizioni Poste Italiane."""

    TRACKING_API_URL = "https://api.poste.it/proxy/v1/tracking"
    TRACKING_API_KEY = "pmzaVxBFkx4NKZNQF1AMO8QBV4rFpqnI8zbfBqzv"
    REQUEST_DELAY = 2  # secondi tra richieste consecutive

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        })

    def get_tracking_info(self, tracking_number: str) -> Optional[Dict]:
        """
        Recupera le informazioni di tracking da Poste Italiane tramite API JSON.

        Args:
            tracking_number: Il numero di tracking della spedizione

        Returns:
            Dict con informazioni tracking o None se non trovato
        """
        if not tracking_number or not tracking_number.strip():
            return None

        tracking_number = tracking_number.strip()

        try:
            url = f"{self.TRACKING_API_URL}?codiceProdotto={tracking_number}"
            headers = {"x-api-key": self.TRACKING_API_KEY}
            response = self.session.get(url, headers=headers, timeout=15)

            if response.status_code == 200:
                try:
                    data = response.json()
                    return self._parse_tracking_response(data, tracking_number)
                except Exception as e:
                    logger.warning("Errore parsing JSON Poste Italiane per %s: %s", tracking_number, e)

            logger.warning("HTTP %s per tracking %s", response.status_code, tracking_number)
            return self._build_empty_tracking(tracking_number)

        except requests.Timeout:
            logger.error("Timeout connessione Poste Italiane per %s", tracking_number)
            return self._build_empty_tracking(tracking_number)
        except requests.RequestException as e:
            logger.error("Errore connessione Poste Italiane: %s", e)
            return self._build_empty_tracking(tracking_number)

    def _parse_tracking_response(self, data: Dict, tracking_number: str) -> Dict:
        """
        Parsifica la risposta JSON di tracking.

        Returns:
            Dict con status, status_date, location, events, delivered, delivery_date
        """
        tracking_url = f"https://www.poste.it/cerca/index.html#/risultati-spedizioni/{tracking_number}"

        shipments = data.get("shipments", [])
        if not shipments:
            return self._build_empty_tracking(tracking_number)

        shipment = shipments[0]
        status_code = shipment.get("statusCode")
        status_description = shipment.get("statusDescription")
        status = status_description or status_code

        delivered = status_code == "CONSEGNATO" if status_code else self._is_delivered(status)

        raw_events = shipment.get("events", [])
        events = [
            {
                "date": e.get("dateTime", ""),
                "status": e.get("description", ""),
                "location": e.get("location", ""),
                "description": e.get("description", ""),
            }
            for e in raw_events
        ]

        delivery_date = None
        if delivered and events:
            delivery_date = events[0].get("date")

        return {
            'status': status,
            'status_date': events[0].get("date") if events else None,
            'location': events[0].get("location") if events else None,
            'events': events,
            'delivered': delivered,
            'delivery_date': delivery_date,
            'tracking_url': tracking_url,
            'last_update': datetime.utcnow().isoformat(),
        }

    def _is_delivered(self, status: Optional[str]) -> bool:
        """Controlla se lo stato indica una consegna avvenuta."""
        if not status:
            return False
        delivered_keywords = ['consegnato', 'delivered', 'recapitato', 'consegnata']
        return any(kw in status.lower() for kw in delivered_keywords)

    def _build_empty_tracking(self, tracking_number: str) -> Dict:
        """Restituisce una struttura vuota con solo il link di tracking."""
        tracking_url = f"https://www.poste.it/cerca/index.html#/risultati-spedizioni/{tracking_number}"
        return {
            'status': None,
            'status_date': None,
            'location': None,
            'events': [],
            'delivered': False,
            'delivery_date': None,
            'tracking_url': tracking_url,
            'last_update': datetime.utcnow().isoformat(),
        }

    def batch_update_tracking(self, tracking_numbers: List[str]) -> Dict[str, Optional[Dict]]:
        """
        Aggiorna tracking per più numeri con un ritardo tra le richieste.

        Returns:
            Dict mapping tracking_number -> tracking_info
        """
        results = {}
        for i, number in enumerate(tracking_numbers):
            if i > 0:
                time.sleep(self.REQUEST_DELAY)
            results[number] = self.get_tracking_info(number)
        return results
