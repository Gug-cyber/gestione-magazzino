FROM python:3.11-slim

# Installa pg_dump necessario per i backup del database
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Cache bust: forza rebuild del layer COPY ad ogni deploy
ARG CACHEBUST=1
RUN echo "Cache bust: $CACHEBUST"

COPY . .

RUN chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]