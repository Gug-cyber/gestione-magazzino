#!/usr/bin/env python3
"""
Script standalone per pingare i servizi di Gestione Magazzino.
Alternativa locale al workflow GitHub Actions keep-alive.

Utilizzo:
    python scripts/ping_services.py

Variabili d'ambiente:
    BACKEND_URL  URL base del backend (default: http://localhost:8000)
"""

import os
import time
import urllib.request
import urllib.error
from datetime import datetime


def ping(url: str) -> tuple[int, float]:
    """Esegue una GET request e ritorna (status_code, latency_ms)."""
    start = time.monotonic()
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            status = response.status
    except urllib.error.HTTPError as e:
        status = e.code
    except urllib.error.URLError as e:
        raise RuntimeError(f"Impossibile raggiungere {url}: {e.reason}") from e
    latency = (time.monotonic() - start) * 1000
    return status, latency


def main() -> None:
    backend_url = os.environ.get("BACKEND_URL", "http://localhost:8000").rstrip("/")
    endpoints = ["/health", "/health/db"]
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] Avvio ping verso {backend_url}")

    all_ok = True
    for path in endpoints:
        url = backend_url + path
        try:
            status, latency = ping(url)
            if status == 200:
                print(f"  ✅ {url} → HTTP {status} ({latency:.0f}ms)")
            else:
                print(f"  ❌ {url} → HTTP {status} ({latency:.0f}ms)")
                all_ok = False
        except RuntimeError as exc:
            print(f"  ❌ {url} → {exc}")
            all_ok = False

    if not all_ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
