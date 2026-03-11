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

# Assicura che PostgreSQL sia in esecuzione
export PATH="/opt/homebrew/opt/postgresql@15/bin:/usr/local/opt/postgresql@15/bin:$PATH"
brew services start postgresql@15 2>/dev/null || true

# --- Avvio backend ---
echo "🚀 Avvio backend..."
cd backend
source venv/bin/activate
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/gestione-magazzino-backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# --- Avvio frontend ---
echo "🚀 Avvio frontend..."
cd frontend
nohup npm run dev -- --host > /tmp/gestione-magazzino-frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "   PID backend:  $BACKEND_PID"
echo "   PID frontend: $FRONTEND_PID"
echo ""

# Attendi che i server siano pronti
sleep 4

echo "======================================"
echo "  App disponibile su:"
echo "   🖥️  http://localhost:5173"
echo "======================================"

# --- IP LAN per accesso da telefono ---
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")

if [ -n "$LAN_IP" ]; then
    echo ""
    echo "📱 Per accedere da telefono/tablet (stessa rete Wi-Fi):"
    echo "   🌐 http://$LAN_IP:5173"
    echo ""
    echo "   Oppure inquadra questo QR code:"
    if command -v qrencode &>/dev/null; then
        qrencode -t ANSIUTF8 "http://$LAN_IP:5173"
    else
        echo "   (installa qrencode con: brew install qrencode)"
    fi
fi

echo ""
echo "📋 Log backend:  /tmp/gestione-magazzino-backend.log"
echo "📋 Log frontend: /tmp/gestione-magazzino-frontend.log"
echo ""
echo "Per fermare i server:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Tieni aperto il terminale
read -p "Premi INVIO per chiudere questa finestra..."
