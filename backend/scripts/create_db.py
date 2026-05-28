#!/usr/bin/env python3
from pathlib import Path
import psycopg2
from psycopg2 import sql
import os, sys

# Locate repo root and .env
THIS = Path(__file__).resolve()
REPO_ROOT = THIS.parents[2]
ENV_PATH = REPO_ROOT / '.env'

def read_env(path: Path):
    data = {}
    if not path.exists():
        return data
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if '=' not in line:
            continue
        k, v = line.split('=', 1)
        data[k.strip()] = v.strip()
    return data

env = read_env(ENV_PATH)

DB_NAME = os.environ.get('DB_NAME') or env.get('DB_NAME') or 'sfe_rfq'
DB_USER = os.environ.get('DB_USER') or env.get('DB_USER') or 'postgres'
DB_PASSWORD = os.environ.get('DB_PASSWORD') or env.get('DB_PASSWORD') or 'postgres'
DB_HOST = os.environ.get('DB_HOST') or env.get('DB_HOST') or 'localhost'
DB_PORT = os.environ.get('DB_PORT') or env.get('DB_PORT') or '5432'

print(f"Using DB host={DB_HOST} port={DB_PORT} user={DB_USER} name={DB_NAME}")

try:
    conn = psycopg2.connect(dbname='postgres', user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname=%s;", (DB_NAME,))
    if cur.fetchone():
        print(f"Database '{DB_NAME}' already exists.")
    else:
        cur.execute(sql.SQL("CREATE DATABASE {};").format(sql.Identifier(DB_NAME)))
        print(f"Created database '{DB_NAME}'.")
    cur.close()
    conn.close()
except Exception as e:
    print("Error creating database:", e)
    sys.exit(1)
