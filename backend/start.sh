#!/bin/sh
set -e

echo "▶ Avvio uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 2
