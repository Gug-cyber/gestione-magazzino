#!/bin/bash
# setup.command — Primo avvio su macOS
# Doppio click dal Finder per installare dipendenze e avviare l'app

set -e

# Vai alla directory del progetto (anche se lo script è lanciato dal Finder)
cd "$(dirname "$0")"

echo "======================================"
echo "  Gestione Magazzino — Setup macOS"
echo "======================================"
echo ""

# --- Homebrew ---
if ! command -v brew &>/dev/null; then
    echo "📦 Installazione Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# --- PostgreSQL ---
if ! command -v psql &>/dev/null; then
    echo "🐘 Installazione PostgreSQL..."
    brew install postgresql@15
    brew services start postgresql@15
    export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
else
    brew services start postgresql@15 2>/dev/null || true
fi
export PATH="/opt/homebrew/opt/postgresql@15/bin:/usr/local/opt/postgresql@15/bin:$PATH"

# --- Python e dipendenze backend ---
if ! command -v python3 &>/dev/null; then
    echo "🐍 Installazione Python..."
    brew install python
fi

if ! command -v pip3 &>/dev/null; then
    echo "📦 Installazione pip..."
    python3 -m ensurepip --upgrade
fi

echo "📦 Installazione dipendenze backend..."
cd backend
python3 -m venv venv 2>/dev/null || true
source venv/bin/activate
pip install -r requirements.txt -q
cd ..

# --- Node.js e dipendenze frontend ---
if ! command -v node &>/dev/null; then
    echo "⬡  Installazione Node.js..."
    brew install node
fi

echo "📦 Installazione dipendenze frontend..."
cd frontend
npm install --silent
cd ..

# --- Database ---
echo "🗄️  Configurazione database..."
psql postgres -c "CREATE USER magazzino WITH PASSWORD 'magazzino';" 2>/dev/null || true
psql postgres -c "CREATE DATABASE magazzino OWNER magazzino;" 2>/dev/null || true

# --- File .env backend ---
if [ ! -f backend/.env ]; then
    echo "⚙️  Creazione file .env backend..."
    cat > backend/.env << 'EOF'
DATABASE_URL=postgresql://magazzino:magazzino@localhost:5432/magazzino
ALLOWED_ORIGINS=http://localhost:5173
CORS_ALLOW_LAN=true
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
EOF
fi

echo ""
echo "✅ Setup completato!"
echo ""

# --- Avvio servizi ---
echo "🚀 Avvio backend..."
cd backend
source venv/bin/activate
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/gestione-magazzino-backend.log 2>&1 &
BACKEND_PID=$!
cd ..

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
