#!/usr/bin/env python3
"""Import products from CSV to production database."""
import csv
import os
import sys


def parse_float(val):
    if not val or val.strip() == '':
        return None
    # Handle invalid values like "27.50.00"
    parts = val.strip().split('.')
    if len(parts) > 2:
        val = parts[0] + '.' + parts[1]
    try:
        return float(val)
    except ValueError:
        return None


def parse_int(val):
    if not val or val.strip() == '':
        return None
    try:
        return int(float(val))
    except ValueError:
        return None


def parse_bool(val):
    return str(val).strip().lower() == 't'


def nullify(val):
    return val if val and val.strip() != '' else None


database_url = os.environ.get('DATABASE_URL', 'postgresql://magazzino:magazzino@db/magazzino')

try:
    import psycopg2
except ImportError:
    print("Installing psycopg2-binary...")
    os.system("pip install psycopg2-binary -q")
    import psycopg2

conn = psycopg2.connect(database_url)
cur = conn.cursor()

csv_path = '/tmp/prodotti.csv'
if not os.path.exists(csv_path):
    print(f"❌ CSV file not found at {csv_path}")
    sys.exit(1)

count = 0
errors = 0

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        try:
            cur.execute("""
                INSERT INTO prodotti (
                    id, nome, descrizione, sku, quantita, quantita_minima,
                    prezzo_acquisto, prezzo_vendita, categoria_id, ubicazione_id,
                    stato_conservazione, lingua, foto_path, barcode,
                    google_drive_folder_id, foto_aggiuntive,
                    is_graded, grading_service, grade,
                    su_vinted, su_wallapop, non_vendibile
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s,
                    %s, %s, %s,
                    %s, %s, %s
                ) ON CONFLICT (id) DO NOTHING
            """, (
                parse_int(row['id']),
                nullify(row['nome']),
                nullify(row['descrizione']),
                nullify(row['sku']),
                parse_int(row['quantita']) or 0,
                parse_int(row['quantita_minima']) or 0,
                parse_float(row['prezzo_acquisto']),
                parse_float(row['prezzo_vendita']),
                parse_int(row['categoria_id']),
                parse_int(row['ubicazione_id']),
                nullify(row['stato_conservazione']),
                nullify(row['lingua']),
                nullify(row['foto_path']),
                nullify(row['barcode']),
                nullify(row['google_drive_folder_id']),
                nullify(row['foto_aggiuntive']),
                parse_bool(row['is_graded']),
                nullify(row['grading_service']),
                nullify(row['grade']),
                parse_bool(row['su_vinted']),
                parse_bool(row['su_wallapop']),
                parse_bool(row['non_vendibile']),
            ))
            conn.commit()
            count += 1
        except Exception as e:
            conn.rollback()
            print(f"⚠️  Errore prodotto id={row.get('id', '?')} ({row.get('nome', '?')}): {e}")
            errors += 1

cur.execute("SELECT setval('prodotti_id_seq', (SELECT MAX(id) FROM prodotti))")
conn.commit()

print(f"\n✅ Importati: {count} prodotti")
if errors:
    print(f"⚠️  Errori: {errors}")

cur.close()
conn.close()
