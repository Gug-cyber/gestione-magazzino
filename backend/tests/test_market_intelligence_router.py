import app.routers.market_intelligence as market_intelligence_router
import app.services.llm_service as llm_service
import app.services.market_telegram as market_telegram
import app.services.notification_service as notification_service
import app.tasks.market_price_scheduler as market_price_scheduler
import app.tasks.market_scout_scheduler as market_scout_scheduler


def test_test_telegram_endpoint_reports_both_channels(client, auth_headers, monkeypatch):
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "order-token")
    monkeypatch.setenv("TELEGRAM_CHAT_ID", "order-chat")
    monkeypatch.setenv("MARKET_BOT_TOKEN", "market-token")
    monkeypatch.setenv("MARKET_CHAT_ID", "market-chat")

    class FakeTelegramChannel:
        @property
        def is_configured(self):
            return True

        def send(self, subject, body):
            assert subject == "Test canale ordini"
            assert "Canale ordini Telegram configurato correttamente" in body
            return True

    monkeypatch.setattr(notification_service, "TelegramChannel", FakeTelegramChannel)
    monkeypatch.setattr(
        market_telegram,
        "send_market_message",
        lambda text, parse_mode="Markdown": (
            "Canale market intelligence Telegram configurato correttamente." in text
            and parse_mode == "Markdown"
        ),
    )

    response = client.post("/api/market-intelligence/test-telegram", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {
        "canale_ordini": {
            "configurato": True,
            "TELEGRAM_BOT_TOKEN": "impostato",
            "TELEGRAM_CHAT_ID": "impostato",
            "messaggio_inviato": True,
        },
        "canale_market": {
            "configurato": True,
            "MARKET_BOT_TOKEN": "impostato",
            "MARKET_CHAT_ID": "impostato",
            "messaggio_inviato": True,
        },
    }


def test_test_groq_endpoint_reports_backend_and_response(client, auth_headers, monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "gsk-test")

    class FakeLLMService:
        def chat(self, prompt, system=""):
            assert prompt == "Rispondi solo con: OK"
            assert system == "Sei un test."
            return "OK dal backend"

    monkeypatch.setattr(llm_service, "LLMService", FakeLLMService)

    response = client.get("/api/market-intelligence/test-groq", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {
        "ai_disponibile": True,
        "backend": "groq",
        "GROQ_API_KEY": "impostata",
        "risposta_test": "OK dal backend",
    }


def test_test_groq_endpoint_returns_error_details_on_failure(client, auth_headers, monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    class FailingLLMService:
        def chat(self, prompt, system=""):
            raise RuntimeError("Ollama offline")

    monkeypatch.setattr(llm_service, "LLMService", FailingLLMService)

    response = client.get("/api/market-intelligence/test-groq", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {
        "ai_disponibile": False,
        "backend": "ollama",
        "GROQ_API_KEY": "mancante (usa Ollama locale)",
        "errore": "Ollama offline",
    }


def test_test_telegram_endpoint_marks_missing_market_channel(client, auth_headers, monkeypatch):
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "order-token")
    monkeypatch.setenv("TELEGRAM_CHAT_ID", "order-chat")
    monkeypatch.delenv("MARKET_BOT_TOKEN", raising=False)
    monkeypatch.delenv("MARKET_CHAT_ID", raising=False)

    class FakeTelegramChannel:
        @property
        def is_configured(self):
            return True

        def send(self, subject, body):
            return True

    monkeypatch.setattr(notification_service, "TelegramChannel", FakeTelegramChannel)
    monkeypatch.setattr(market_telegram, "send_market_message", lambda *args, **kwargs: True)

    response = client.post("/api/market-intelligence/test-telegram", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["canale_market"] == {
        "configurato": False,
        "MARKET_BOT_TOKEN": "mancante",
        "MARKET_CHAT_ID": "mancante",
        "messaggio_inviato": False,
    }


def test_start_market_scout_scheduler_warns_when_market_bot_missing(monkeypatch, caplog):
    monkeypatch.setattr(market_scout_scheduler, "_scheduler_started", False)
    monkeypatch.delenv("MARKET_BOT_TOKEN", raising=False)

    class DummyThread:
        def __init__(self, target, name, daemon):
            self.target = target
            self.name = name
            self.daemon = daemon

        def start(self):
            return None

    monkeypatch.setattr(market_scout_scheduler.threading, "Thread", DummyThread)

    caplog.set_level("WARNING")
    market_scout_scheduler.start_market_scout_scheduler()

    assert any("MARKET_BOT_TOKEN non configurato" in message for message in caplog.messages)


def test_start_market_price_scheduler_warns_when_market_bot_missing(monkeypatch, caplog):
    monkeypatch.setattr(market_price_scheduler, "_scheduler_started", False)
    monkeypatch.delenv("MARKET_BOT_TOKEN", raising=False)

    class DummyThread:
        def __init__(self, target, name, daemon):
            self.target = target
            self.name = name
            self.daemon = daemon

        def start(self):
            return None

    monkeypatch.setattr(market_price_scheduler.threading, "Thread", DummyThread)

    caplog.set_level("WARNING")
    market_price_scheduler.start_market_price_scheduler()

    assert any("MARKET_BOT_TOKEN non configurato" in message for message in caplog.messages)
