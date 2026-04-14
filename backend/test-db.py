import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv()
url = os.environ.get("DATABASE_URL")
if not url:
    print("NO DATABASE URL")
    exit(1)

try:
    conn = psycopg2.connect(url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT * FROM precos ORDER BY id DESC LIMIT 5")
    rows = cursor.fetchall()
    
    if len(rows) > 0:
        print("Columns:", list(rows[0].keys()))
        for r in rows:
            print({k: r[k] for k in ["id", "data_pesquisa", "data", "created_at"] if k in r})
    else:
        print("No rows found.")
    
except Exception as e:
    print("Error:", e)
