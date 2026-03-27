"""
Servizio unificato per tracking automatico di tutti i corrieri.
"""
import logging
import time
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, List, Optional

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class BaseTrackingProvider(ABC):
    """Classe base astratta per provider di tracking."""

    REQUEST_TIMEOUT = 10
    REQUEST_DELAY = 2  # secondi tra richieste consecutive

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/120.0.0.0 Safari/537.36'
            ),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        })

    @abstractmethod
    def get_tracking_info(self, tracking_number: str) -> Optional[Dict]:
        """Recupera informazioni tracking dal corriere."""

    def _standard_response(self, status: Optional[str], delivered: bool, **kwargs) -> Dict:
        """Formatta risposta standard per tutti i corrieri."""
        return {
            'status': status,
            'delivered': delivered,
            'status_date': kwargs.get('status_date'),
            'location': kwargs.get('location'),
            'events': kwargs.get('events', []),
            'delivery_date': kwargs.get('delivery_date'),
            'last_update': datetime.utcnow().isoformat(),
        }

    def _is_delivered(self, status: Optional[str]) -> bool:
        """Controlla se lo stato indica una consegna avvenuta."""
        if not status:
            return False
        delivered_keywords = ['consegnato', 'delivered', 'recapitato', 'consegnata']
        return any(kw in status.lower() for kw in delivered_keywords)

    def batch_update_tracking(self, tracking_numbers: List[str]) -> Dict[str, Optional[Dict]]:
        """Aggiorna tracking per più numeri con un ritardo tra le richieste."""
        results = {}
        for i, number in enumerate(tracking_numbers):
            if i > 0:
                time.sleep(self.REQUEST_DELAY)
            results[number] = self.get_tracking_info(number)
        return results


class PosteItalianeProvider(BaseTrackingProvider):
    """Provider per Poste Italiane."""

    TRACKING_API_URL = "https://www.poste.it/online/dovequando/index.do"

    def get_tracking_info(self, tracking_number: str) -> Optional[Dict]:
        if not tracking_number or not tracking_number.strip():
            return None
        tracking_number = tracking_number.strip()
        try:
            url = f"{self.TRACKING_API_URL}?numSped={tracking_number}"
            response = self.session.get(url, timeout=self.REQUEST_TIMEOUT)
            if response.status_code != 200:
                logger.warning("HTTP %s per tracking Poste %s", response.status_code, tracking_number)
                return self._build_empty_tracking(tracking_number)
            return self._parse_poste(response.text, tracking_number)
        except requests.Timeout:
            logger.error("Timeout Poste Italiane per %s", tracking_number)
            return None
        except requests.RequestException as e:
            logger.error("Errore Poste Italiane %s: %s", tracking_number, e)
            return None

    def _parse_poste(self, html: str, tracking_number: str) -> Dict:
        soup = BeautifulSoup(html, 'html.parser')
        status = None
        for selector in ['.tracking-status', '.spedizione-stato', '.stato-spedizione',
                         '[class*="status"]', '[class*="stato"]']:
            elem = soup.select_one(selector)
            if elem and elem.text.strip():
                status = elem.text.strip()
                break

        events = []
        for selector in ['.tracking-event', '.evento-spedizione', '[class*="event"]', 'tr.tracking-row']:
            raw_events = soup.select(selector)
            if raw_events:
                events = [
                    {
                        'date': e.get('data-date', ''),
                        'status': e.text.strip(),
                        'location': e.get('data-location', ''),
                        'description': '',
                    }
                    for e in raw_events if e.text.strip()
                ]
                break

        delivered = self._is_delivered(status)
        return self._standard_response(
            status=status,
            delivered=delivered,
            events=events,
        )

    def _build_empty_tracking(self, tracking_number: str) -> Dict:
        return self._standard_response(status=None, delivered=False)


class BRTProvider(BaseTrackingProvider):
    """Provider per BRT."""

    BASE_URL = "https://www.brt.it/privati/spedizioni/tracking"

    def get_tracking_info(self, tracking_number: str) -> Optional[Dict]:
        if not tracking_number or not tracking_number.strip():
            return None
        try:
            params = {'trackingNumber': tracking_number.strip()}
            response = self.session.get(self.BASE_URL, params=params, timeout=self.REQUEST_TIMEOUT)
            if response.status_code != 200:
                logger.warning("HTTP %s per tracking BRT %s", response.status_code, tracking_number)
                return self._standard_response(status=None, delivered=False)
            return self._parse_brt(response.text)
        except Exception as e:
            logger.error("Errore tracking BRT %s: %s", tracking_number, e)
            return None

    def _parse_brt(self, html: str) -> Dict:
        soup = BeautifulSoup(html, 'html.parser')
        status = None
        for selector in ['[class*="stato"]', '[class*="status"]', '.tracking-status', 'td.stato']:
            elem = soup.select_one(selector)
            if elem and elem.text.strip():
                status = elem.text.strip()
                break
        delivered = self._is_delivered(status)
        return self._standard_response(status=status, delivered=delivered)


class DHLProvider(BaseTrackingProvider):
    """Provider per DHL."""

    BASE_URL = "https://www.dhl.com/it-it/home/tracking.html"

    def get_tracking_info(self, tracking_number: str) -> Optional[Dict]:
        if not tracking_number or not tracking_number.strip():
            return None
        try:
            params = {'tracking-id': tracking_number.strip()}
            response = self.session.get(self.BASE_URL, params=params, timeout=self.REQUEST_TIMEOUT)
            if response.status_code != 200:
                logger.warning("HTTP %s per tracking DHL %s", response.status_code, tracking_number)
                return self._standard_response(status=None, delivered=False)
            return self._parse_dhl(response.text)
        except Exception as e:
            logger.error("Errore tracking DHL %s: %s", tracking_number, e)
            return None

    def _parse_dhl(self, html: str) -> Dict:
        soup = BeautifulSoup(html, 'html.parser')
        status = None
        for selector in ['[class*="status"]', '[class*="stato"]', '.tracking-status']:
            elem = soup.select_one(selector)
            if elem and elem.text.strip():
                status = elem.text.strip()
                break
        delivered = self._is_delivered(status)
        return self._standard_response(status=status, delivered=delivered)


class SDAProvider(BaseTrackingProvider):
    """Provider per SDA."""

    BASE_URL = "https://www.sda.it/it/it/tools/traccia-la-tua-spedizione.html"

    def get_tracking_info(self, tracking_number: str) -> Optional[Dict]:
        if not tracking_number or not tracking_number.strip():
            return None
        try:
            url = f"{self.BASE_URL}#{tracking_number.strip()}"
            response = self.session.get(url, timeout=self.REQUEST_TIMEOUT)
            if response.status_code != 200:
                logger.warning("HTTP %s per tracking SDA %s", response.status_code, tracking_number)
                return self._standard_response(status=None, delivered=False)
            return self._parse_sda(response.text)
        except Exception as e:
            logger.error("Errore tracking SDA %s: %s", tracking_number, e)
            return None

    def _parse_sda(self, html: str) -> Dict:
        soup = BeautifulSoup(html, 'html.parser')
        status = None
        for selector in ['[class*="status"]', '[class*="stato"]', '.tracking-status']:
            elem = soup.select_one(selector)
            if elem and elem.text.strip():
                status = elem.text.strip()
                break
        delivered = self._is_delivered(status)
        return self._standard_response(status=status, delivered=delivered)


class GLSProvider(BaseTrackingProvider):
    """Provider per GLS."""

    BASE_URL = "https://gls-group.eu/IT/it/ricerca-spedizioni.html"

    def get_tracking_info(self, tracking_number: str) -> Optional[Dict]:
        if not tracking_number or not tracking_number.strip():
            return None
        try:
            params = {'match': tracking_number.strip()}
            response = self.session.get(self.BASE_URL, params=params, timeout=self.REQUEST_TIMEOUT)
            if response.status_code != 200:
                logger.warning("HTTP %s per tracking GLS %s", response.status_code, tracking_number)
                return self._standard_response(status=None, delivered=False)
            return self._parse_gls(response.text)
        except Exception as e:
            logger.error("Errore tracking GLS %s: %s", tracking_number, e)
            return None

    def _parse_gls(self, html: str) -> Dict:
        soup = BeautifulSoup(html, 'html.parser')
        status = None
        for selector in ['[class*="status"]', '[class*="stato"]', '.tracking-status']:
            elem = soup.select_one(selector)
            if elem and elem.text.strip():
                status = elem.text.strip()
                break
        delivered = self._is_delivered(status)
        return self._standard_response(status=status, delivered=delivered)


class UPSProvider(BaseTrackingProvider):
    """Provider per UPS."""

    BASE_URL = "https://www.ups.com/track"

    def get_tracking_info(self, tracking_number: str) -> Optional[Dict]:
        if not tracking_number or not tracking_number.strip():
            return None
        try:
            params = {'loc': 'it_IT', 'tracknum': tracking_number.strip()}
            response = self.session.get(self.BASE_URL, params=params, timeout=self.REQUEST_TIMEOUT)
            if response.status_code != 200:
                logger.warning("HTTP %s per tracking UPS %s", response.status_code, tracking_number)
                return self._standard_response(status=None, delivered=False)
            return self._parse_ups(response.text)
        except Exception as e:
            logger.error("Errore tracking UPS %s: %s", tracking_number, e)
            return None

    def _parse_ups(self, html: str) -> Dict:
        soup = BeautifulSoup(html, 'html.parser')
        status = None
        for selector in ['[class*="status"]', '[class*="stato"]', '.tracking-status']:
            elem = soup.select_one(selector)
            if elem and elem.text.strip():
                status = elem.text.strip()
                break
        delivered = self._is_delivered(status)
        return self._standard_response(status=status, delivered=delivered)


class FedExProvider(BaseTrackingProvider):
    """Provider per FedEx."""

    BASE_URL = "https://www.fedex.com/fedextrack/"

    def get_tracking_info(self, tracking_number: str) -> Optional[Dict]:
        if not tracking_number or not tracking_number.strip():
            return None
        try:
            params = {'trknbr': tracking_number.strip()}
            response = self.session.get(self.BASE_URL, params=params, timeout=self.REQUEST_TIMEOUT)
            if response.status_code != 200:
                logger.warning("HTTP %s per tracking FedEx %s", response.status_code, tracking_number)
                return self._standard_response(status=None, delivered=False)
            return self._parse_fedex(response.text)
        except Exception as e:
            logger.error("Errore tracking FedEx %s: %s", tracking_number, e)
            return None

    def _parse_fedex(self, html: str) -> Dict:
        soup = BeautifulSoup(html, 'html.parser')
        status = None
        for selector in ['[class*="status"]', '[class*="stato"]', '.tracking-status']:
            elem = soup.select_one(selector)
            if elem and elem.text.strip():
                status = elem.text.strip()
                break
        delivered = self._is_delivered(status)
        return self._standard_response(status=status, delivered=delivered)


class NexiveProvider(BaseTrackingProvider):
    """Provider per Nexive."""

    BASE_URL = "https://www.nexive.it/strumenti/traccia-spedizione"

    def get_tracking_info(self, tracking_number: str) -> Optional[Dict]:
        if not tracking_number or not tracking_number.strip():
            return None
        try:
            params = {'barcode': tracking_number.strip()}
            response = self.session.get(self.BASE_URL, params=params, timeout=self.REQUEST_TIMEOUT)
            if response.status_code != 200:
                logger.warning("HTTP %s per tracking Nexive %s", response.status_code, tracking_number)
                return self._standard_response(status=None, delivered=False)
            return self._parse_nexive(response.text)
        except Exception as e:
            logger.error("Errore tracking Nexive %s: %s", tracking_number, e)
            return None

    def _parse_nexive(self, html: str) -> Dict:
        soup = BeautifulSoup(html, 'html.parser')
        status = None
        for selector in ['[class*="status"]', '[class*="stato"]', '.tracking-status']:
            elem = soup.select_one(selector)
            if elem and elem.text.strip():
                status = elem.text.strip()
                break
        delivered = self._is_delivered(status)
        return self._standard_response(status=status, delivered=delivered)


class AmazonLogisticsProvider(BaseTrackingProvider):
    """Provider per Amazon Logistics."""

    BASE_URL = "https://track.amazon.it/tracking"

    def get_tracking_info(self, tracking_number: str) -> Optional[Dict]:
        if not tracking_number or not tracking_number.strip():
            return None
        try:
            url = f"{self.BASE_URL}/{tracking_number.strip()}"
            response = self.session.get(url, timeout=self.REQUEST_TIMEOUT)
            if response.status_code != 200:
                logger.warning("HTTP %s per tracking Amazon %s", response.status_code, tracking_number)
                return self._standard_response(status=None, delivered=False)
            return self._parse_amazon(response.text)
        except Exception as e:
            logger.error("Errore tracking Amazon %s: %s", tracking_number, e)
            return None

    def _parse_amazon(self, html: str) -> Dict:
        soup = BeautifulSoup(html, 'html.parser')
        status = None
        for selector in ['[class*="status"]', '[class*="stato"]', '.tracking-status']:
            elem = soup.select_one(selector)
            if elem and elem.text.strip():
                status = elem.text.strip()
                break
        delivered = self._is_delivered(status)
        return self._standard_response(status=status, delivered=delivered)


class TNTProvider(BaseTrackingProvider):
    """Provider per TNT."""

    BASE_URL = "https://www.tnt.com/express/it_it/site/tracking.html"

    def get_tracking_info(self, tracking_number: str) -> Optional[Dict]:
        if not tracking_number or not tracking_number.strip():
            return None
        try:
            params = {'searchType': 'CON', 'cons': tracking_number.strip()}
            response = self.session.get(self.BASE_URL, params=params, timeout=self.REQUEST_TIMEOUT)
            if response.status_code != 200:
                logger.warning("HTTP %s per tracking TNT %s", response.status_code, tracking_number)
                return self._standard_response(status=None, delivered=False)
            return self._parse_tnt(response.text)
        except Exception as e:
            logger.error("Errore tracking TNT %s: %s", tracking_number, e)
            return None

    def _parse_tnt(self, html: str) -> Dict:
        soup = BeautifulSoup(html, 'html.parser')
        status = None
        for selector in ['[class*="status"]', '[class*="stato"]', '.tracking-status']:
            elem = soup.select_one(selector)
            if elem and elem.text.strip():
                status = elem.text.strip()
                break
        delivered = self._is_delivered(status)
        return self._standard_response(status=status, delivered=delivered)


class InPostProvider(BaseTrackingProvider):
    """Provider per InPost."""

    BASE_URL = "https://inpost.it/tracking"

    def get_tracking_info(self, tracking_number: str) -> Optional[Dict]:
        if not tracking_number or not tracking_number.strip():
            return None
        try:
            params = {'number': tracking_number.strip()}
            response = self.session.get(self.BASE_URL, params=params, timeout=self.REQUEST_TIMEOUT)
            if response.status_code != 200:
                logger.warning("HTTP %s per tracking InPost %s", response.status_code, tracking_number)
                return self._standard_response(status=None, delivered=False)
            return self._parse_inpost(response.text)
        except Exception as e:
            logger.error("Errore tracking InPost %s: %s", tracking_number, e)
            return None

    def _parse_inpost(self, html: str) -> Dict:
        soup = BeautifulSoup(html, 'html.parser')
        status = None
        for selector in ['[class*="status"]', '[class*="stato"]', '.tracking-status']:
            elem = soup.select_one(selector)
            if elem and elem.text.strip():
                status = elem.text.strip()
                break
        delivered = self._is_delivered(status)
        return self._standard_response(status=status, delivered=delivered)


class TrackingServiceFactory:
    """Factory per creare il provider corretto in base al corriere."""

    PROVIDERS = {
        'Poste Italiane': PosteItalianeProvider,
        'BRT': BRTProvider,
        'DHL': DHLProvider,
        'SDA': SDAProvider,
        'GLS': GLSProvider,
        'UPS': UPSProvider,
        'FedEx': FedExProvider,
        'Nexive': NexiveProvider,
        'Amazon Logistics': AmazonLogisticsProvider,
        'TNT': TNTProvider,
        'InPost': InPostProvider,
    }

    @classmethod
    def get_provider(cls, corriere: str) -> Optional[BaseTrackingProvider]:
        """Ritorna il provider corretto per il corriere."""
        provider_class = cls.PROVIDERS.get(corriere)
        if provider_class:
            return provider_class()
        logger.warning("Provider non trovato per corriere: %s", corriere)
        return None

    @classmethod
    def is_supported(cls, corriere: str) -> bool:
        """Verifica se un corriere è supportato."""
        return corriere in cls.PROVIDERS


class UnifiedTrackingService:
    """Servizio unificato per tutti i corrieri."""

    @staticmethod
    def get_tracking_info(corriere: str, tracking_number: str) -> Optional[Dict]:
        """
        Recupera tracking info per qualsiasi corriere supportato.

        Args:
            corriere: Nome corriere (es: "Poste Italiane", "DHL")
            tracking_number: Numero tracking

        Returns:
            Dict con info tracking o None se corriere non supportato / errore
        """
        provider = TrackingServiceFactory.get_provider(corriere)
        if not provider:
            return None
        return provider.get_tracking_info(tracking_number)

    @staticmethod
    def batch_update_tracking(shipments: List[tuple]) -> Dict[str, Optional[Dict]]:
        """
        Aggiorna tracking per più coppie (corriere, tracking_number).

        Args:
            shipments: Lista di tuple (corriere, tracking_number)

        Returns:
            Dict mapping "{corriere}:{tracking_number}" -> tracking_info
        """
        results = {}
        for corriere, tracking_number in shipments:
            key = f"{corriere}:{tracking_number}"
            provider = TrackingServiceFactory.get_provider(corriere)
            if provider:
                results[key] = provider.get_tracking_info(tracking_number)
            else:
                results[key] = None
            time.sleep(BaseTrackingProvider.REQUEST_DELAY)
        return results
