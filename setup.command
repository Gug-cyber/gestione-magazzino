#!/bin/bash
cd "$(dirname "$0")"

# ─── Colori ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── Intestazione ──────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════╗"
echo "║   🏭 Gestione Magazzino - Installer  ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ─── PATH Homebrew (Apple Silicon + Intel) ─────────────────────────────────
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:$PATH"

# ─── A) Homebrew ───────────────────────────────────────────────────────────
echo -e "${BLUE}[1/6] Controllo Homebrew...${NC}"
if ! command -v brew &>/dev/null; then
  echo -e "${YELLOW}  → Homebrew non trovato. Installazione in corso...${NC}"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Ricarica PATH per Apple Silicon
  if [ -f /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
else
  echo -e "${GREEN}  ✓ Homebrew già installato${NC}"
fi

# ─── B) Python 3.11+ ───────────────────────────────────────────────────────
echo -e "${BLUE}[2/6] Controllo Python 3.11+...${NC}"
if ! brew list python@3.11 &>/dev/null; then
  echo -e "${YELLOW}  → Installazione Python 3.11...${NC}"
  brew install python@3.11
else
  echo -e "${GREEN}  ✓ Python 3.11 già installato${NC}"
fi
export PATH="$(brew --prefix python@3.11)/bin:$PATH"

# ─── C) Node.js 18+ ────────────────────────────────────────────────────────
echo -e "${BLUE}[3/6] Controllo Node.js...${NC}"
if ! command -v node &>/dev/null; then
  echo -e "${YELLOW}  → Installazione Node.js...${NC}"
  brew install node
else
  echo -e "${GREEN}  ✓ Node.js già installato ($(node --version))${NC}"
fi

# ─── D) PostgreSQL 16 ──────────────────────────────────────────────────────
echo -e "${BLUE}[4/6] Controllo PostgreSQL 16...${NC}"
if ! brew list postgresql@16 &>/dev/null; then
  echo -e "${YELLOW}  → Installazione PostgreSQL 16...${NC}"
  brew install postgresql@16
fi
export PATH="$(brew --prefix postgresql@16)/bin:$PATH"

echo -e "${YELLOW}  → Avvio servizio PostgreSQL...${NC}"
brew services start postgresql@16

echo -n "  → Attendo che PostgreSQL sia pronto"
for i in $(seq 1 30); do
  pg_isready -q 2>/dev/null && break
  echo -n "."
  sleep 1
done
echo ""
echo -e "${GREEN}  ✓ PostgreSQL pronto${NC}"

# ─── E) Database ───────────────────────────────────────────────────────────
echo -e "${BLUE}[5/6] Configurazione database...${NC}"
psql postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='magazzino'" 2>/dev/null | grep -q 1 || \
  psql postgres -c "CREATE USER magazzino WITH PASSWORD 'magazzino';" 2>/dev/null
psql postgres -tc "SELECT 1 FROM pg_database WHERE datname='magazzino'" 2>/dev/null | grep -q 1 || \
  psql postgres -c "CREATE DATABASE magazzino OWNER magazzino;" 2>/dev/null
echo -e "${GREEN}  ✓ Database configurato${NC}"

# ─── F) Backend ────────────────────────────────────────────────────────────
echo -e "${BLUE}[6/6] Configurazione backend...${NC}"
cd backend

if [ ! -d "venv" ]; then
  echo -e "${YELLOW}  → Creazione virtualenv...${NC}"
  python3 -m venv venv
fi

source venv/bin/activate
echo -e "${YELLOW}  → Installazione dipendenze Python...${NC}"
pip install -r requirements.txt --quiet

if [ ! -f ".env" ]; then
  echo -e "${YELLOW}  → Creazione file .env...${NC}"
  cat > .env << 'EOF'
DATABASE_URL=postgresql://magazzino:magazzino@localhost:5432/magazzino
ALLOWED_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
EOF
fi

deactivate
cd ..
echo -e "${GREEN}  ✓ Backend configurato${NC}"

# ─── G) Frontend ───────────────────────────────────────────────────────────
echo -e "${BLUE}[+] Installazione dipendenze frontend...${NC}"
cd frontend
npm install --silent
cd ..
echo -e "${GREEN}  ✓ Frontend configurato${NC}"

# ─── H) Avvio server ───────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}🚀 Avvio server...${NC}"

# Backend
cd backend
source venv/bin/activate
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
echo $! > ../backend.pid
cd ..

# Frontend
cd frontend
nohup npm run dev -- --host > ../frontend.log 2>&1 &
echo $! > ../frontend.pid
cd ..

# ─── I) Attesa server ──────────────────────────────────────────────────────
echo -n "  → Attendo il backend"
for i in $(seq 1 60); do
  curl -s http://localhost:8000/health > /dev/null 2>&1 && break
  echo -n "."
  sleep 1
done
echo ""

echo -n "  → Attendo il frontend"
for i in $(seq 1 60); do
  curl -s http://localhost:3000 > /dev/null 2>&1 && break
  echo -n "."
  sleep 1
done
echo ""

# ─── J) Apri browser ───────────────────────────────────────────────────────
open http://localhost:3000

# ─── K) Messaggio finale ───────────────────────────────────────────────────
echo ""
echo -e "${GREEN}✅ Gestione Magazzino è in esecuzione!${NC}"
echo ""
echo "  🌐 App:        http://localhost:3000"
echo "  🔧 Backend:    http://localhost:8000"
echo "  📚 API Docs:   http://localhost:8000/docs"
echo ""
echo "  📄 Log backend:  backend.log"
echo "  📄 Log frontend: frontend.log"
echo ""
echo "  Per fermare l'app: doppio click su stop.command"
echo ""
echo "Premi INVIO per chiudere questa finestra..."
read
