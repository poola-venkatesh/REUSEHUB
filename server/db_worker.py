import sys
import json
import sqlite3
import os
import atexit

db_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
os.makedirs(db_dir, exist_ok=True)
db_path = os.path.join(db_dir, 'rent_and_reuse.db')

conn = sqlite3.connect(db_path, check_same_thread=False, timeout=15.0)
conn.execute("PRAGMA foreign_keys = ON;")
conn.execute("PRAGMA journal_mode = WAL;")
conn.execute("PRAGMA busy_timeout = 15000;")
conn.execute("PRAGMA synchronous = NORMAL;")
cursor = conn.cursor()

def cleanup():
    try:
        conn.commit()
        conn.close()
    except Exception:
        pass

atexit.register(cleanup)

for raw_line in sys.stdin:
    line = raw_line.strip()
    if not line:
        continue
    try:
        req = json.loads(line)
    except Exception as parse_err:
        sys.stdout.write(json.dumps({'error': f'JSON parse error: {str(parse_err)}'}) + '\n')
        sys.stdout.flush()
        continue

    req_id = req.get('id')
    action = req.get('action', 'query')
    sql = req.get('sql', '')
    params = req.get('params', [])

    try:
        if action == 'exec':
            cursor.executescript(sql)
            conn.commit()
            out = {'id': req_id, 'success': True}
        else:
            cursor.execute(sql, params)
            sql_trimmed = sql.strip().upper()
            if sql_trimmed.startswith(('SELECT', 'PRAGMA', 'EXPLAIN')):
                cols = [col[0] for col in cursor.description] if cursor.description else []
                rows = [dict(zip(cols, r)) for r in cursor.fetchall()]
                out = {'id': req_id, 'rows': rows, 'changes': 0}
            else:
                conn.commit()
                out = {'id': req_id, 'rows': [], 'changes': conn.total_changes, 'lastID': cursor.lastrowid}
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        out = {'id': req_id, 'error': str(e)}

    sys.stdout.write(json.dumps(out) + '\n')
    sys.stdout.flush()
