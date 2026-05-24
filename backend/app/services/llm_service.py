import logging

import httpx


logger = logging.getLogger(__name__)


class LLMService:
    def __init__(
        self,
        base_url: str = "http://127.0.0.1:11434",
        model: str = "llama3.1:8b",
        timeout: int = 120,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    def chat(self, prompt: str, system: str = "") -> str:
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system,
            "stream": False,
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(f"{self.base_url}/api/generate", json=payload)
            response.raise_for_status()
            data = response.json()
        except httpx.RequestError as exc:
            logger.error("Ollama non raggiungibile: %s", exc)
            raise RuntimeError("Servizio AI non disponibile: Ollama non raggiungibile.")
        except httpx.HTTPStatusError as exc:
            logger.error("Errore Ollama HTTP %s: %s", exc.response.status_code, exc.response.text)
            raise RuntimeError(f"Servizio AI non disponibile (HTTP {exc.response.status_code}).")
        except Exception as exc:
            logger.error("Errore inatteso chiamando Ollama: %s", exc)
            raise RuntimeError("Errore inatteso durante la generazione AI.")

        text = (data.get("response") or "").strip()
        if not text:
            raise RuntimeError("Risposta AI vuota.")
        return text
