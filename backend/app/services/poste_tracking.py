"""
Servizio per il tracking automatico delle spedizioni Poste Italiane.
Utilizza web scraping per recuperare lo stato delle spedizioni.
"""
import requests
from bs4 import BeautifulSoup
from typing import Optional, Dict, List
from datetime import datetime
import logging
import time

logger = logging.getLogger(__name__)


class PosteTrackingService:
    """Servizio per tracking spedizioni Poste Italiane."""

    TRACKING_API_URL = "https://www.poste.it/online/dovequando/index.do"
    REQUEST_DELAY = 2  # secondi tra richieste consecutive

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        })

    def get_tracking_info(self, tracking_number: str) -> Optional[Dict]:
        """
        Recupera le informazioni di tracking da Poste Italiane.

        Args:
            tracking_number: Il numero di tracking della spedizione

        Returns:
            Dict con informazioni tracking o None se non trovato
        """
        if not tracking_number or not tracking_number.strip():
            return None

        tracking_number = tracking_number.strip()

        try:
            url = f"https://www.poste.it/cerca/index.html#/risultati-spedizioni/{tracking_number}"
            # Prova con l'API JSON di Poste Italiane
            api_url = f"https://www.poste.it/online/dovequando/index.do?numSped={tracking_number}"
            response = self.session.get(api_url, timeout=15)

            if response.status_code != 200:
                logger.warning("HTTP %s per tracking %s", response.status_code, tracking_number)
                return self._build_empty_tracking(tracking_number, url)

            tracking_data = self._parse_tracking_response(response.text, url)
            return tracking_data

        except requests.Timeout:
            logger.error("Timeout connessione Poste Italiane per %s", tracking_number)
            return None
        except requests.RequestException as e:
            logger.error("Errore connessione Poste Italiane: %s", e)
            return None

    def _parse_tracking_response(self, html: str, tracking_url: str) -> Dict:
        """
        Parsifica la risposta HTML/JSON di tracking.

        Returns:
            Dict con status, status_date, location, events, delivered, delivery_date
        """
        soup = BeautifulSoup(html, 'html.parser')

        tracking_info = {
            'status': None,
            'status_date': None,
            'location': None,
            'events': [],
            'delivered': False,
            'delivery_date': None,
            'tracking_url': tracking_url,
            'last_update': datetime.utcnow().isoformat(),
        }

        # Cerca gli elementi di stato nella pagina
        # La struttura HTML di Poste Italiane può variare; tentiamo diversi selettori
        status_selectors = [
            '.tracking-status',
            '.spedizione-stato',
            '.stato-spedizione',
            '[class*="status"]',
            '[class*="stato"]',
        ]
        for selector in status_selectors:
            elem = soup.select_one(selector)
            if elem and elem.text.strip():
                tracking_info['status'] = elem.text.strip()
                break

        # Cerca gli eventi di tracking
        event_selectors = [
            '.tracking-event',
            '.evento-spedizione',
            '[class*="event"]',
            'tr.tracking-row',
        ]
        for selector in event_selectors:
            events = soup.select(selector)
            if events:
                tracking_info['events'] = [
                    {
                        'date': e.get('data-date', ''),
                        'status': e.text.strip(),
                        'location': e.get('data-location', ''),
                        'description': '',
                    }
                    for e in events if e.text.strip()
                ]
                break

        # Verifica se consegnato
        delivered_keywords = ['consegnato', 'delivered', 'recapitato']
        if tracking_info['status']:
            status_lower = tracking_info['status'].lower()
            if any(kw in status_lower for kw in delivered_keywords):
                tracking_info['delivered'] = True
                tracking_info['delivery_date'] = datetime.utcnow().isoformat()

        return tracking_info

    def _build_empty_tracking(self, tracking_number: str, tracking_url: str) -> Dict:
        """Restituisce una struttura vuota con solo il link di tracking."""
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
