import json
import os
import threading
from contextlib import contextmanager

import psycopg
from psycopg import sql
from psycopg.types.json import Jsonb

_CONFIG_LOCK = threading.Lock()
_DB_CONFIG = None


def _get_config() -> dict:
    global _DB_CONFIG
    if _DB_CONFIG is not None:
        return _DB_CONFIG

    def _resolve(key: str):
        return os.environ.get(key)

    config = {
        "host": _resolve("PGHOST"),
        "dbname": _resolve("PGDATABASE"),
        "user": _resolve("PGUSER"),
        "password": _resolve("PGPASSWORD"),
        "sslmode": _resolve("PGSSLMODE"),
    }
    port = _resolve("PGPORT")
    if port:
        config["port"] = port
    channel_binding = _resolve("PGCHANNELBINDING")
    if channel_binding:
        config["channel_binding"] = channel_binding

    config = {k: v for k, v in config.items() if v}
    if "port" not in config:
        config["port"] = 5432

    with _CONFIG_LOCK:
        if _DB_CONFIG is None:
            _DB_CONFIG = config
        return _DB_CONFIG


@contextmanager
def get_connection():
    cfg = _get_config()
    if not cfg:
        raise RuntimeError("Banco de dados não configurado (falta PGHOST/PGUSER/PGPASSWORD/PGDATABASE)")
    conn = psycopg.connect(**cfg)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _format_identifier(name: str):
    return sql.Identifier(name)


def _ensure_tables():
    statements = [
        """
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            nome TEXT,
            email TEXT,
            salt TEXT,
            senha_hash TEXT,
            is_admin BOOLEAN,
            criado_em TIMESTAMPTZ,
            funcionalidade TEXT,
            role TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS pending (
            username TEXT PRIMARY KEY,
            nome TEXT,
            email TEXT,
            salt TEXT,
            senha_hash TEXT,
            solicitado_em TIMESTAMPTZ,
            funcionalidade TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS lockouts (
            username TEXT PRIMARY KEY,
            tentativas INTEGER,
            bloqueado_ate TIMESTAMPTZ
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS metas_local (
            produto TEXT PRIMARY KEY,
            meta BIGINT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS cache_estoque (
            key TEXT PRIMARY KEY,
            payload JSONB,
            updated_at TIMESTAMPTZ DEFAULT now()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS cache_pedidos (
            arquivo_pdf TEXT NOT NULL,
            data TIMESTAMPTZ NOT NULL,
            loja TEXT NOT NULL,
            produto TEXT NOT NULL,
            unidade TEXT NOT NULL,
            quant DOUBLE PRECISION NOT NULL,
            valor_total DOUBLE PRECISION NOT NULL,
            valor_unit DOUBLE PRECISION NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS pedidos_importados (
            key TEXT PRIMARY KEY,
            payload JSONB,
            updated_at TIMESTAMPTZ DEFAULT now()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS estoque_manual (
            id SERIAL PRIMARY KEY,
            data TIMESTAMPTZ,
            tipo TEXT,
            produto TEXT,
            quant DOUBLE PRECISION,
            unidade TEXT,
            loja TEXT,
            arquivo TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS caixas_lojas (
            id SERIAL PRIMARY KEY,
            data DATE,
            loja TEXT,
            n_loja INTEGER,
            caixas_benverde INTEGER,
            caixas_ccj INTEGER,
            ccj_banca INTEGER,
            ccj_mercadoria INTEGER,
            ccj_retirada INTEGER,
            caixas_bananas INTEGER,
            total INTEGER,
            entregue TEXT
        )
        """,
    ]
    with get_connection() as conn:
        with conn.cursor() as cur:
            for stmt in statements:
                cur.execute(stmt)


_JSON_CACHE_TABLES = {"cache_estoque"}
_RELATIONAL_CACHE_TABLES = {"cache_pedidos"}
_CACHE_TABLES = _JSON_CACHE_TABLES | _RELATIONAL_CACHE_TABLES


def _ensure_cache_columns():
    cache_columns = {
        "key": "TEXT",
        "payload": "JSONB",
        "updated_at": "TIMESTAMPTZ DEFAULT now()",
    }
    for table in _JSON_CACHE_TABLES | {"pedidos_importados"}:
        with get_connection() as conn:
            with conn.cursor() as cur:
                for column, definition in cache_columns.items():
                    cur.execute(
                        sql.SQL(
                            "ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {definition}"
                        ).format(
                            table=_format_identifier(table),
                            column=_format_identifier(column),
                            definition=sql.SQL(definition),
                        )
                    )
                cur.execute(
                    sql.SQL(
                        "CREATE UNIQUE INDEX IF NOT EXISTS {idx} ON {table} (key)"
                    ).format(
                        idx=_format_identifier(f"{table}_key_idx"),
                        table=_format_identifier(table),
                    )
                )


def _ensure_cache_pedidos_columns():
    columns = {
        "arquivo_pdf": "TEXT",
        "data": "TIMESTAMPTZ",
        "loja": "TEXT",
        "produto": "TEXT",
        "unidade": "TEXT",
        "quant": "DOUBLE PRECISION",
        "valor_total": "DOUBLE PRECISION",
        "valor_unit": "DOUBLE PRECISION",
        "updated_at": "TIMESTAMPTZ DEFAULT now()",
    }
    with get_connection() as conn:
        with conn.cursor() as cur:
            for column, definition in columns.items():
                cur.execute(
                    sql.SQL(
                        "ALTER TABLE cache_pedidos ADD COLUMN IF NOT EXISTS {column} {definition}"
                    ).format(
                        column=_format_identifier(column),
                        definition=sql.SQL(definition),
                    )
                )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS cache_pedidos_arquivo_pdf_idx
                ON cache_pedidos (arquivo_pdf)
                """
            )


def _ensure_auth_columns():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT")
            cur.execute("ALTER TABLE pending ADD COLUMN IF NOT EXISTS email TEXT")
            cur.execute(
                """
                UPDATE users
                SET role = CASE
                    WHEN role IN ('admin', 'operacional') THEN role
                    WHEN COALESCE(is_admin, FALSE) THEN 'admin'
                    ELSE 'operacional'
                END
                WHERE role IS NULL OR role NOT IN ('admin', 'operacional')
                """
            )
            cur.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'operacional'")
            cur.execute("ALTER TABLE users ALTER COLUMN role SET NOT NULL")


def _ensure_db_structures():
    _ensure_tables()
    _ensure_auth_columns()
    _ensure_cache_columns()
    _ensure_cache_pedidos_columns()


_ensure_db_structures()


def fetch_cache(table_name: str) -> dict:
    if table_name not in _CACHE_TABLES:
        return {}
    if table_name == "cache_pedidos":
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT arquivo_pdf, data, loja, produto, unidade, quant, valor_total, valor_unit
                    FROM cache_pedidos
                    WHERE arquivo_pdf IS NOT NULL
                    ORDER BY data DESC NULLS LAST, arquivo_pdf, produto
                    """
                )
                cache: dict = {}
                for row in cur.fetchall():
                    arquivo_pdf = str(row[0] or "").strip()
                    if not arquivo_pdf:
                        continue
                    cache.setdefault(arquivo_pdf, []).append(
                        {
                            "data": row[1].isoformat() if row[1] else None,
                            "loja": row[2],
                            "produto": row[3],
                            "unidade": row[4],
                            "quant": float(row[5] or 0),
                            "valor_total": float(row[6] or 0),
                            "valor_unit": float(row[7] or 0),
                        }
                    )
                return cache
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL(
                    "SELECT key, payload FROM {table} WHERE key IS NOT NULL AND payload IS NOT NULL"
                ).format(table=_format_identifier(table_name))
            )
            cache = {}
            for key, payload in cur.fetchall():
                if isinstance(payload, str):
                    try:
                        payload = json.loads(payload)
                    except json.JSONDecodeError:
                        pass
                cache[key] = payload
            return cache


def save_cache_pedidos_relacional(records: list[dict]) -> None:
    if not records:
        return

    valores = []
    arquivos = set()
    for record in records:
        if not isinstance(record, dict):
            continue
        arquivo_pdf = str(record.get("arquivo_pdf") or "").strip()
        if not arquivo_pdf:
            continue
        arquivos.add(arquivo_pdf)
        valores.append(
            (
                arquivo_pdf,
                record.get("data"),
                str(record.get("loja") or "").strip(),
                str(record.get("produto") or "").strip(),
                str(record.get("unidade") or "KG").strip() or "KG",
                float(record.get("quant") or 0.0),
                float(record.get("valor_total") or 0.0),
                float(record.get("valor_unit") or 0.0),
            )
        )

    if not valores:
        return

    with get_connection() as conn:
        with conn.cursor() as cur:
            if arquivos:
                cur.execute(
                    "DELETE FROM cache_pedidos WHERE arquivo_pdf = ANY(%s)",
                    (list(arquivos),),
                )
            cur.executemany(
                """
                INSERT INTO cache_pedidos
                (arquivo_pdf, data, loja, produto, unidade, quant, valor_total, valor_unit, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, now())
                """,
                valores,
            )


def upsert_cache(table_name: str, entries: dict) -> None:
    if table_name not in _CACHE_TABLES or not entries:
        return
    if table_name == "cache_pedidos":
        registros = []
        for arquivo_pdf, itens in entries.items():
            if not isinstance(itens, list):
                continue
            for item in itens:
                if not isinstance(item, dict):
                    continue
                registros.append(
                    {
                        "arquivo_pdf": arquivo_pdf,
                        "data": item.get("data"),
                        "loja": item.get("loja"),
                        "produto": item.get("produto"),
                        "unidade": item.get("unidade", "KG"),
                        "quant": item.get("quant", 0),
                        "valor_total": item.get("valor_total", 0),
                        "valor_unit": item.get("valor_unit", 0),
                    }
                )
        save_cache_pedidos_relacional(registros)
        return
    with get_connection() as conn:
        with conn.cursor() as cur:
            stmt = sql.SQL(
                """
                INSERT INTO {table} (key, payload, updated_at)
                VALUES (%s, %s, now())
                ON CONFLICT (key) DO UPDATE
                  SET payload = EXCLUDED.payload,
                      updated_at = EXCLUDED.updated_at
                """
            ).format(table=_format_identifier(table_name))
            for key, payload in entries.items():
                payload_json = (
                    payload
                    if isinstance(payload, str)
                    else json.dumps(payload, ensure_ascii=False, default=str)
                )
                cur.execute(stmt, (key, payload_json))


def clear_cache_table(table_name: str) -> None:
    if table_name not in _CACHE_TABLES:
        return
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL("DELETE FROM {table}").format(table=_format_identifier(table_name))
            )


def load_metas() -> list[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT produto, meta FROM metas_local ORDER BY produto")
            return [{"Produto": row[0], "Meta": row[1]} for row in cur.fetchall()]


def replace_metas(records: list[dict]) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM metas_local")
            for item in records:
                cur.execute(
                    "INSERT INTO metas_local (produto, meta) VALUES (%s, %s)",
                    (item.get("Produto"), item.get("Meta")),
                )


def insert_movimentacoes(records: list[dict]) -> None:
    if not records:
        return
    with get_connection() as conn:
        with conn.cursor() as cur:
            for rec in records:
                cur.execute(
                    """
                    INSERT INTO estoque_manual (data, tipo, produto, quant, unidade, loja, arquivo)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        rec.get("data"),
                        rec.get("tipo"),
                        rec.get("produto"),
                        rec.get("quant"),
                        rec.get("unidade"),
                        rec.get("loja"),
                        rec.get("arquivo"),
                    ),
                )


def fetch_movimentacoes() -> list[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, data, tipo, produto, quant, unidade, loja, arquivo
                FROM estoque_manual
                ORDER BY id
                """
            )
            return [
                {
                    "id": row[0],
                    "data": row[1],
                    "tipo": row[2],
                    "produto": row[3],
                    "quant": row[4],
                    "unidade": row[5],
                    "loja": row[6],
                    "arquivo": row[7],
                }
                for row in cur.fetchall()
            ]


def delete_movimentacao(entry_id: int) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM estoque_manual WHERE id = %s", (entry_id,))


def insert_caixa(registro: dict) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO caixas_lojas (
                    data, loja, n_loja,
                    caixas_benverde, caixas_ccj, ccj_banca,
                    ccj_mercadoria, ccj_retirada, caixas_bananas,
                    total, entregue
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    registro.get("data"),
                    registro.get("loja"),
                    registro.get("n_loja"),
                    registro.get("caixas_benverde"),
                    registro.get("caixas_ccj"),
                    registro.get("ccj_banca"),
                    registro.get("ccj_mercadoria"),
                    registro.get("ccj_retirada"),
                    registro.get("caixas_bananas"),
                    registro.get("total"),
                    registro.get("entregue"),
                ),
            )


def fetch_caixas() -> list[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT data, loja, n_loja, caixas_benverde, caixas_ccj,
                       ccj_banca, ccj_mercadoria, ccj_retirada,
                       caixas_bananas, total, entregue
                FROM caixas_lojas
                ORDER BY data DESC NULLS LAST, loja, n_loja
                """
            )
            return [
                {
                    "data": row[0],
                    "loja": row[1],
                    "n_loja": row[2],
                    "caixas_benverde": row[3],
                    "caixas_ccj": row[4],
                    "ccj_banca": row[5],
                    "ccj_mercadoria": row[6],
                    "ccj_retirada": row[7],
                    "caixas_bananas": row[8],
                    "total": row[9],
                    "entregue": row[10],
                }
                for row in cur.fetchall()
            ]


def fetch_pedidos_importados() -> list[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT key, payload
                FROM pedidos_importados
                WHERE payload IS NOT NULL
                ORDER BY updated_at ASC NULLS LAST, key ASC
                """
            )
            registros: list[dict] = []
            for key, payload in cur.fetchall():
                if key == "default" and isinstance(payload, list):
                    registros.extend(item for item in payload if isinstance(item, dict))
                    continue
                if isinstance(payload, dict):
                    registros.append(payload)
            return registros


def save_pedidos_importados(records: list[dict]) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM pedidos_importados")
            if not records:
                return

            valores = [
                (f"pedido_{indice:08d}", Jsonb(record))
                for indice, record in enumerate(records, start=1)
                if isinstance(record, dict)
            ]
            if not valores:
                return

            cur.executemany(
                """
                INSERT INTO pedidos_importados (key, payload, updated_at)
                VALUES (%s, %s, now())
                """,
                valores,
            )
