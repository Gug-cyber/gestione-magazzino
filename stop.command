#!/bin/bash
# stop.command — Ferma backend e frontend

cd "$(dirname "$0")"

echo "======================================"
echo "  Gestione Magazzino — Stop"
echo "======================================"
echo ""

stop_pid() {
    local name="$1"
    local pidfile="$2"
    if [ -f "$pidfile" ]; then
        local pid
        pid=$(cat "$pidfile")
        if kill -0 "$pid" 2>/dev/null; then
            echo "⏹️  Fermo $name (PID $pid)..."
            kill "$pid" 2>/dev/null || true
            sleep 3
            kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
        else
            echo "ℹ️  $name non in esecuzione"
        fi
        rm -f "$pidfile"
    else
        echo "ℹ️  Nessun PID trovato per $name"
    fi
}

stop_pid "backend"  "/tmp/gestione-magazzino-backend.pid"
stop_pid "frontend" "/tmp/gestione-magazzino-frontend.pid"

echo ""
echo "✅ Server fermati."
echo ""
read -p "Premi INVIO per chiudere questa finestra..."
