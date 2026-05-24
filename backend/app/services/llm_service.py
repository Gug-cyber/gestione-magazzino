import logging
import os

import httpx


logger = logging.getLogger(__name__)
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"


class LLMService:
    def __init__(
        self,
        base_url: str = "http://172.17.0.1:11434",
        model: str = "llama3.1:8b",
        timeout: int = 120,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self.groq_api_key = os.environ.get("GROQ_API_KEY", "")

    def chat(self, prompt: str, system: str = "") -> str:
        if self.groq_api_key:
            return self._chat_groq(prompt, system)
        return self._chat_ollama(prompt, system)

    def _chat_groq(self, prompt: str, system: str = "") -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": GROQ_MODEL,
            "messages": messages,
        }

        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(GROQ_API_URL, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
        except httpx.RequestError as exc:
            logger.error("Groq non raggiungibile: %s", exc)
            raise RuntimeError("Servizio AI non disponibile: Groq non raggiungibile.")
        except httpx.HTTPStatusError as exc:
            logger.error("Errore Groq HTTP %s: %s", exc.response.status_code, exc.response.text)
            raise RuntimeError(f"Servizio AI non disponibile (HTTP {exc.response.status_code}).")
        except Exception as exc:
            logger.error("Errore inatteso chiamando Groq: %s", exc)
            raise RuntimeError("Errore inatteso durante la generazione AI.")

        text = (data.get("choices", [{}])[0].get("message", {}).get("content") or "").strip()
        if not text:
            raise RuntimeError("Risposta AI vuota.")
        return text

    def _chat_ollama(self, prompt: str, system: str = "") -> str:
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
