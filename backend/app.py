import os, sqlite3, re, uuid, tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from groq import Groq
from database import get_db, get_schema, seed_db, DB_PATH, extract_schema_from_db
import pandas as pd

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

# Session storage: session_id -> db_path
session_dbs = {}

_groq = None
def groq_client():
    global _groq
    if _groq is None:
        _groq = Groq(api_key=os.environ["GROQ_API_KEY"])
    return _groq

if not os.path.exists(DB_PATH):
    seed_db()

def extract_sql(text):
    m = re.search(r"```(?:sql)?\s*([\s\S]+?)```", text, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    m = re.search(r"(SELECT|WITH)[\s\S]+?;", text, re.IGNORECASE)
    if m:
        return m.group(0).strip()
    return text.strip()

def run_query(sql, db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.execute(sql)
        cols = [d[0] for d in cur.description] if cur.description else []
        rows = [list(r) for r in cur.fetchall()]
        return cols, rows
    finally:
        conn.close()


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/schema")
def schema():
    session_id = request.args.get("session_id")
    if session_id and session_id in session_dbs:
        db_path = session_dbs[session_id]
        return jsonify({"schema": extract_schema_from_db(db_path)})
    return jsonify({"schema": get_schema()})


@app.get("/tables")
def tables():
    session_id = request.args.get("session_id")
    db_path = session_dbs.get(session_id, DB_PATH) if session_id else DB_PATH
    conn = sqlite3.connect(db_path)
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    table_list = [r[0] for r in cur.fetchall()]
    result = {}
    for t in table_list:
        count = conn.execute(f"SELECT COUNT(*) FROM [{t}]").fetchone()[0]
        result[t] = count
    conn.close()
    return jsonify({"tables": result})


@app.post("/upload")
def upload():
    session_id = request.form.get("session_id") or str(uuid.uuid4())

    # Handle SQLite .db file
    if "db_file" in request.files:
        file = request.files["db_file"]
        if not file.filename.endswith(".db"):
            return jsonify({"error": "Only .db (SQLite) files supported"}), 400
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
        file.save(tmp.name)
        session_dbs[session_id] = tmp.name
        schema = extract_schema_from_db(tmp.name)
        conn = sqlite3.connect(tmp.name)
        cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cur.fetchall()]
        conn.close()
        return jsonify({"session_id": session_id, "schema": schema, "tables": tables, "type": "sqlite"})

    # Handle CSV files
    if "csv_file" in request.files:
        file = request.files["csv_file"]
        if not file.filename.endswith(".csv"):
            return jsonify({"error": "Only .csv files supported"}), 400
        tmp_db = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
        df = pd.read_csv(file)
        df.columns = df.columns.str.strip()
        table_name = re.sub(r"[^a-zA-Z0-9_]", "_", file.filename.replace(".csv", ""))
        conn = sqlite3.connect(tmp_db.name)
        df.to_sql(table_name, conn, if_exists="replace", index=False)
        conn.close()
        session_dbs[session_id] = tmp_db.name
        schema = extract_schema_from_db(tmp_db.name)
        return jsonify({"session_id": session_id, "schema": schema, "tables": [table_name], "type": "csv"})

    return jsonify({"error": "No file provided"}), 400


@app.post("/reset")
def reset():
    session_id = (request.get_json(silent=True) or {}).get("session_id")
    if session_id in session_dbs:
        del session_dbs[session_id]
    return jsonify({"status": "reset"})


@app.post("/generate")
def generate():
    body = request.get_json(silent=True) or {}
    prompt = (body.get("prompt") or "").strip()
    session_id = body.get("session_id")
    if not prompt:
        return jsonify({"error": "prompt is required"}), 400

    if session_id and session_id in session_dbs:
        schema = extract_schema_from_db(session_dbs[session_id])
    else:
        schema = get_schema()

    system_prompt = f"""You are an expert SQLite query writer.
Given the database schema below, generate a correct, efficient SQL query for the user's request.

{schema}

Rules:
1. Output ONLY the SQL query inside a ```sql ... ``` code block.
2. After the code block, write one sentence explaining what the query does.
3. Use proper JOINs, aliases, and formatting.
4. Always add LIMIT 100 unless the user asks for all records.
5. Do NOT use FULL OUTER JOIN or RIGHT JOIN (not supported in SQLite).
6. Column aliases should be human-readable.
7. Use square brackets around table/column names if they contain spaces.
"""

    try:
        chat = groq_client().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=1024,
        )
        raw = chat.choices[0].message.content
        sql = extract_sql(raw)
        explanation = re.sub(r"```[\s\S]+?```", "", raw).strip()
        explanation = explanation.split("\n")[0].strip() if explanation else ""
        return jsonify({"sql": sql, "explanation": explanation})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/execute")
def execute():
    body = request.get_json(silent=True) or {}
    sql = (body.get("sql") or "").strip()
    session_id = body.get("session_id")
    if not sql:
        return jsonify({"error": "sql is required"}), 400

    first_word = sql.split()[0].upper()
    if first_word in ("DROP", "DELETE", "TRUNCATE", "ALTER", "CREATE"):
        return jsonify({"error": f"{first_word} statements are not allowed"}), 403

    db_path = session_dbs.get(session_id, DB_PATH) if session_id else DB_PATH

    try:
        cols, rows = run_query(sql, db_path)
        return jsonify({"columns": cols, "rows": rows, "rowCount": len(rows)})
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 400


@app.post("/explain")
def explain():
    body = request.get_json(silent=True) or {}
    sql = (body.get("sql") or "").strip()
    if not sql:
        return jsonify({"error": "sql is required"}), 400
    try:
        chat = groq_client().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a SQL tutor. Explain the given SQL in simple plain English. 3-5 sentences max. No code blocks."},
                {"role": "user", "content": f"Explain this SQL:\n{sql}"},
            ],
            temperature=0.3,
            max_tokens=300,
        )
        return jsonify({"explanation": chat.choices[0].message.content.strip()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=True, port=port)