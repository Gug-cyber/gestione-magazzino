#!/bin/bash
cd "$(dirname "$0")"

# PATH Homebrew (Apple Silicon + Intel)
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:$PATH"
if command -v brew &>/dev/null; then
  export PATH="$(brew --prefix postgresql@16)/bin:$PATH"
fi

echo "🚀 Avvio Gestione Magazzino..."

# Avvia PostgreSQL se non attivo
brew services start postgresql@16 2>/dev/null

echo -n "  → Attendo PostgreSQL"
for i in $(seq 1 30); do
  pg_isready -q 2>/dev/null && break
  echo -n "."
  sleep 1
done
echo ""

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

# Attendi e apri browser
echo -n "  → Attendo i server"
for i in $(seq 1 60); do
  curl -s http://localhost:8000/health > /dev/null 2>&1 && \
  curl -s http://localhost:3000 > /dev/null 2>&1 && break
  echo -n "."
  sleep 1
done
echo ""

open http://localhost:3000

echo ""
echo "✅ App avviata su http://localhost:3000"
echo ""
echo "  🌐 App:        http://localhost:3000"
echo "  🔧 Backend:    http://localhost:8000"
echo "  📚 API Docs:   http://localhost:8000/docs"
echo ""
echo "  Per fermare l'app: doppio click su stop.command"
echo ""
echo "Premi INVIO per chiudere questa finestra..."
read
