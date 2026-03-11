#!/bin/bash
cd "$(dirname "$0")"

echo "🛑 Arresto Gestione Magazzino..."

# Ferma tramite PID file
if [ -f backend.pid ]; then
  kill "$(cat backend.pid)" 2>/dev/null
  rm backend.pid
fi
if [ -f frontend.pid ]; then
  kill "$(cat frontend.pid)" 2>/dev/null
  rm frontend.pid
fi

# Fallback: cerca per nome processo
pkill -f "uvicorn app.main:app" 2>/dev/null
pkill -f "vite" 2>/dev/null

echo "✅ App fermata."
echo "Premi INVIO per chiudere..."
read
