#!/bin/bash
# start.command — Avvio rapido su macOS (dopo il primo setup)
# Doppio click dal Finder per avviare backend e frontend

set -e

# Vai alla directory del progetto
cd "$(dirname "$0")"

echo "======================================"
echo "  Gestione Magazzino — Avvio"
echo "======================================"
echo ""

# --- Ferma eventuali istanze precedenti ---
stop_pid() {
    local name="$1"
    local pidfile="$2"
    if [ -f "$pidfile" ]; then
        local pid
        pid=$(cat "$pidfile")
        if kill -0 "$pid" 2>/dev/null; then
            echo "⏹️  Fermo $name precedente (PID $pid)..."
            kill "$pid" 2>/dev/null || true
            sleep 3
            kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$pidfile"
    fi
}

stop_pid "backend"  "/tmp/gestione-magazzino-backend.pid"
stop_pid "frontend" "/tmp/gestione-magazzino-frontend.pid"

# Assicura che PostgreSQL sia in esecuzione
export PATH="/opt/homebrew/opt/postgresql@15/bin:/usr/local/opt/postgresql@15/bin:$PATH"
brew services start postgresql@15 2>/dev/null || true

# --- Avvio backend ---
echo "🚀 Avvio backend..."
cd backend
source venv/bin/activate
export CORS_ALLOW_LAN=true
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/gestione-magazzino-backend.log 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > /tmp/gestione-magazzino-backend.pid
cd ..

# --- Avvio frontend ---
echo "🚀 Avvio frontend..."
cd frontend
VITE_HTTPS=true VITE_API_TARGET=http://localhost:8000 nohup npm run dev -- --host > /tmp/gestione-magazzino-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > /tmp/gestione-magazzino-frontend.pid
cd ..

echo "   PID backend:  $BACKEND_PID"
echo "   PID frontend: $FRONTEND_PID"
echo ""

# --- Health-check backend (attende fino a 30 secondi) ---
echo "⏳ Attendo che il backend sia pronto..."
BACKEND_READY=false
if command -v curl &>/dev/null; then
    for i in $(seq 1 30); do
        if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
            BACKEND_READY=true
            break
        fi
        sleep 1
    done
else
    sleep 6
    BACKEND_READY=true
fi

if [ "$BACKEND_READY" = true ]; then
    echo "✅ Backend pronto."
else
    echo "⚠️  Backend non risponde dopo 30 secondi — controlla /tmp/gestione-magazzino-backend.log"
fi

# --- Health-check frontend (attende fino a 30 secondi) ---
echo "⏳ Attendo che il frontend sia pronto..."
FRONTEND_READY=false
if command -v lsof &>/dev/null; then
    for i in $(seq 1 30); do
        if lsof -i :5173 > /dev/null 2>&1; then
            FRONTEND_READY=true
            break
        fi
        sleep 1
    done
elif command -v nc &>/dev/null; then
    for i in $(seq 1 30); do
        if nc -z localhost 5173 > /dev/null 2>&1; then
            FRONTEND_READY=true
            break
        fi
        sleep 1
    done
else
    sleep 6
    FRONTEND_READY=true
fi

if [ "$FRONTEND_READY" = true ]; then
    echo "✅ Frontend pronto."
else
    echo "⚠️  Frontend non risponde dopo 30 secondi — controlla /tmp/gestione-magazzino-frontend.log"
fi

echo ""
echo "======================================"
echo "  App disponibile su:"
echo "   🖥️  https://localhost:5173"
echo "======================================"

# --- IP LAN per accesso da telefono ---
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")

if [ -n "$LAN_IP" ]; then
    echo ""
    echo "📱 Per accedere da telefono/tablet (stessa rete Wi-Fi):"
    echo "   🌐 https://$LAN_IP:5173"
    echo ""
    echo "   ⚠️  La prima volta il browser mostra 'certificato non attendibile':"
    echo "      → clicca 'Avanzate' → 'Continua comunque' (o 'Visita sito non sicuro')"
    echo ""
    echo "   Oppure inquadra questo QR code:"
    if command -v qrencode &>/dev/null; then
        qrencode -t ANSIUTF8 "https://$LAN_IP:5173"
    else
        echo "   (installa qrencode con: brew install qrencode)"
    fi
fi

echo ""
echo "📋 Log backend:  /tmp/gestione-magazzino-backend.log"
echo "📋 Log frontend: /tmp/gestione-magazzino-frontend.log"
echo ""
echo "Per fermare i server, fai doppio click su stop.command"
echo "   oppure esegui: ./stop.command"
echo ""

# Tieni aperto il terminale
read -p "Premi INVIO per chiudere questa finestra..."
