"""auth.py
Sistema de autenticacao para o app LUMII.
Usa hashlib, secrets, threading, datetime, re e helpers do app.
"""

import hashlib
import logging
import os
import re
import secrets
import threading
from datetime import datetime, timedelta, timezone

from db import get_connection
from mailer import send_password_reset_code_email

_LOCK = threading.Lock()
logger = logging.getLogger(__name__)

PASSWORD_RESET_ATTEMPTS = 5
PASSWORD_RESET_COOLDOWN_SECONDS = 60


def _hash_senha(salt: str, senha: str) -> str:
    return hashlib.sha256((salt + senha).encode()).hexdigest()


def _normalizar_role(role: str | None, is_admin: bool | None = False) -> str:
    if role in {"admin", "operacional"}:
        return role
    return "admin" if is_admin else "operacional"


def _normalizar_email(email: str) -> str:
    return email.strip().lower()


def _email_valido(email: str) -> bool:
    return bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email))


def _get_reset_ttl_minutes() -> int:
    raw_value = os.environ.get("RESET_CODE_TTL_MINUTES", "15").strip()
    try:
        minutes = int(raw_value)
    except ValueError:
        return 15
    return minutes if minutes > 0 else 15


def _get_password_reset_pepper() -> str:
    pepper = os.environ.get("PASSWORD_RESET_PEPPER", "").strip()
    if not pepper:
        raise RuntimeError("PASSWORD_RESET_PEPPER precisa estar definido no ambiente.")
    return pepper


def _hash_codigo_recuperacao(username: str, email: str, code: str) -> str:
    pepper = _get_password_reset_pepper()
    payload = f"{pepper}:{username}:{email}:{code}"
    return hashlib.sha256(payload.encode()).hexdigest()


def _gerar_codigo_recuperacao() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def carregar_users() -> list[dict]:
    with _LOCK:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT username, nome, email, salt, senha_hash, is_admin, criado_em, funcionalidade, role
                    FROM users ORDER BY username
                    """
                )
                return [
                    {
                        "username": row[0],
                        "nome": row[1],
                        "email": row[2],
                        "salt": row[3],
                        "senha_hash": row[4],
                        "is_admin": row[5],
                        "criado_em": row[6],
                        "funcionalidade": row[7],
                        "role": _normalizar_role(row[8], row[5]),
                    }
                    for row in cur.fetchall()
                ]


def salvar_users(users: list[dict]) -> None:
    with _LOCK:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM users")
                for user in users:
                    role = _normalizar_role(
                        user.get("role"), bool(user.get("is_admin", False))
                    )
                    cur.execute(
                        """
                        INSERT INTO users (
                            username, nome, email, salt, senha_hash, is_admin, criado_em, funcionalidade, role
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            user.get("username"),
                            user.get("nome"),
                            user.get("email"),
                            user.get("salt"),
                            user.get("senha_hash"),
                            role == "admin",
                            user.get("criado_em"),
                            user.get("funcionalidade", "administracao geral"),
                            role,
                        ),
                    )


def carregar_pending() -> list[dict]:
    with _LOCK:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT username, nome, email, salt, senha_hash, solicitado_em, funcionalidade
                    FROM pending ORDER BY username
                    """
                )
                return [
                    {
                        "username": row[0],
                        "nome": row[1],
                        "email": row[2],
                        "salt": row[3],
                        "senha_hash": row[4],
                        "solicitado_em": row[5],
                        "funcionalidade": row[6],
                    }
                    for row in cur.fetchall()
                ]


def salvar_pending(pending: list[dict]) -> None:
    with _LOCK:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM pending")
                for entry in pending:
                    cur.execute(
                        """
                        INSERT INTO pending (
                            username, nome, email, salt, senha_hash, solicitado_em, funcionalidade
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            entry.get("username"),
                            entry.get("nome"),
                            entry.get("email"),
                            entry.get("salt"),
                            entry.get("senha_hash"),
                            entry.get("solicitado_em"),
                            entry.get("funcionalidade", "administracao geral"),
                        ),
                    )


def carregar_lockouts() -> dict:
    with _LOCK:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT username, tentativas, bloqueado_ate
                    FROM lockouts
                    """
                )
                return {
                    row[0]: {"tentativas": row[1], "bloqueado_ate": row[2]}
                    for row in cur.fetchall()
                }


def salvar_lockouts(lockouts: dict) -> None:
    with _LOCK:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM lockouts")
                for username, entry in lockouts.items():
                    cur.execute(
                        """
                        INSERT INTO lockouts (username, tentativas, bloqueado_ate)
                        VALUES (%s, %s, %s)
                        """,
                        (username, entry.get("tentativas", 0), entry.get("bloqueado_ate")),
                    )


def get_user(username: str) -> dict | None:
    user = next((u for u in carregar_users() if u["username"] == username), None)
    if user:
        user.setdefault("funcionalidade", "administracao geral")
        user["role"] = _normalizar_role(
            user.get("role"), bool(user.get("is_admin", False))
        )
        user["is_admin"] = user["role"] == "admin"
    return user


def verificar_login(username: str, senha: str) -> tuple[bool, str]:
    with _LOCK:
        agora = datetime.now(timezone.utc)
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT tentativas, bloqueado_ate FROM lockouts WHERE username = %s",
                    (username,),
                )
                row = cur.fetchone()
                tentativas = row[0] if row else 0
                bloqueado_ate = row[1] if row else None
                if bloqueado_ate and isinstance(bloqueado_ate, str):
                    bloqueado_ate = datetime.fromisoformat(bloqueado_ate)

                if bloqueado_ate and agora < bloqueado_ate:
                    hora = bloqueado_ate.astimezone().strftime("%H:%M")
                    return False, f"Usuario bloqueado ate {hora}"

                def _registrar_tentativa() -> tuple[bool, str]:
                    nonlocal tentativas
                    tentativas = (tentativas or 0) + 1
                    bloqueado_destino = None
                    if tentativas >= 5:
                        bloqueado_destino = agora + timedelta(minutes=15)
                        tentativas = 0
                    cur.execute(
                        """
                        INSERT INTO lockouts (username, tentativas, bloqueado_ate)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (username) DO UPDATE
                          SET tentativas = EXCLUDED.tentativas,
                              bloqueado_ate = EXCLUDED.bloqueado_ate
                        """,
                        (username, tentativas, bloqueado_destino),
                    )
                    if bloqueado_destino:
                        return False, "Muitas tentativas. Usuario bloqueado por 15 minutos."
                    return False, f"Usuario ou senha invalidos ({tentativas} de 5)"

                cur.execute(
                    """
                    SELECT username, salt, senha_hash, funcionalidade
                    FROM users WHERE username = %s
                    """,
                    (username,),
                )
                user_row = cur.fetchone()

                if user_row is None:
                    return _registrar_tentativa()

                salt = user_row[1]
                senha_hash = user_row[2]
                if _hash_senha(salt, senha) != senha_hash:
                    return _registrar_tentativa()

                cur.execute(
                    """
                    INSERT INTO lockouts (username, tentativas, bloqueado_ate)
                    VALUES (%s, 0, NULL)
                    ON CONFLICT (username) DO UPDATE
                      SET tentativas = EXCLUDED.tentativas,
                          bloqueado_ate = EXCLUDED.bloqueado_ate
                    """,
                    (username,),
                )
                return True, "ok"


def registrar_usuario(
    username: str,
    nome: str,
    email: str,
    senha: str,
    funcionalidade: str = "administracao geral",
) -> tuple[bool, str]:
    if not re.fullmatch(r"[a-zA-Z0-9_]{3,20}", username):
        return False, "Username deve ter 3-20 caracteres (letras, numeros e _)"

    email_normalizado = _normalizar_email(email)
    if not _email_valido(email_normalizado):
        return False, "Email invalido"

    if len(senha) < 6:
        return False, "Senha deve ter pelo menos 6 caracteres"

    with _LOCK:
        salt = secrets.token_hex(32)
        hash_ = _hash_senha(salt, senha)
        agora_iso = datetime.now(timezone.utc).isoformat()
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM users WHERE username = %s", (username,))
                if cur.fetchone():
                    return False, "Username ja cadastrado"

                cur.execute("SELECT 1 FROM users WHERE lower(email) = %s", (email_normalizado,))
                if cur.fetchone():
                    return False, "Email ja cadastrado"

                cur.execute("SELECT 1 FROM pending WHERE username = %s", (username,))
                if cur.fetchone():
                    return False, "Username ja aguarda aprovacao"

                cur.execute("SELECT 1 FROM pending WHERE lower(email) = %s", (email_normalizado,))
                if cur.fetchone():
                    return False, "Email ja aguarda aprovacao"

                cur.execute("SELECT COUNT(*) FROM users")
                total_users = cur.fetchone()[0]
                if total_users == 0:
                    cur.execute(
                        """
                        INSERT INTO users (
                            username, nome, email, salt, senha_hash, is_admin, criado_em, funcionalidade, role
                        ) VALUES (%s, %s, %s, %s, %s, TRUE, %s, %s, 'admin')
                        """,
                        (
                            username,
                            nome,
                            email_normalizado,
                            salt,
                            hash_,
                            agora_iso,
                            funcionalidade,
                        ),
                    )
                    return True, "admin_criado"

                cur.execute(
                    """
                    INSERT INTO pending (
                        username, nome, email, salt, senha_hash, solicitado_em, funcionalidade
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        username,
                        nome,
                        email_normalizado,
                        salt,
                        hash_,
                        agora_iso,
                        funcionalidade,
                    ),
                )
                return True, "pendente"


def aprovar_usuario(username: str) -> bool:
    with _LOCK:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT username, nome, email, salt, senha_hash, funcionalidade
                    FROM pending WHERE username = %s
                    """,
                    (username,),
                )
                entry = cur.fetchone()
                if entry is None:
                    return False

                cur.execute(
                    """
                    INSERT INTO users (
                        username, nome, email, salt, senha_hash, is_admin, criado_em, funcionalidade, role
                    ) VALUES (%s, %s, %s, %s, %s, FALSE, %s, %s, 'operacional')
                    """,
                    (
                        entry[0],
                        entry[1],
                        entry[2],
                        entry[3],
                        entry[4],
                        datetime.now(timezone.utc).isoformat(),
                        entry[5] or "administracao geral",
                    ),
                )
                cur.execute("DELETE FROM pending WHERE username = %s", (username,))
                return True


def rejeitar_usuario(username: str) -> bool:
    with _LOCK:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM pending WHERE username = %s", (username,))
                return cur.rowcount > 0


def solicitar_codigo_recuperacao(username: str, email: str) -> tuple[bool, str]:
    username = username.strip()
    email_normalizado = _normalizar_email(email)
    if not username or not _email_valido(email_normalizado):
        return False, "ignored"

    agora = datetime.now(timezone.utc)
    ttl_minutes = _get_reset_ttl_minutes()
    codigo = _gerar_codigo_recuperacao()
    codigo_hash = _hash_codigo_recuperacao(username, email_normalizado, codigo)
    nome = username

    with _LOCK:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT username, nome, email
                    FROM users
                    WHERE username = %s AND lower(email) = %s
                    """,
                    (username, email_normalizado),
                )
                user_row = cur.fetchone()
                if user_row is None:
                    return False, "not_found"

                nome = user_row[1] or username

                cur.execute(
                    """
                    SELECT requested_at
                    FROM password_reset_codes
                    WHERE username = %s
                      AND consumed_at IS NULL
                      AND expires_at > %s
                    ORDER BY requested_at DESC
                    LIMIT 1
                    """,
                    (username, agora),
                )
                cooldown_row = cur.fetchone()
                if cooldown_row is not None:
                    requested_at = cooldown_row[0]
                    if isinstance(requested_at, str):
                        requested_at = datetime.fromisoformat(requested_at)
                    if requested_at and requested_at > agora - timedelta(
                        seconds=PASSWORD_RESET_COOLDOWN_SECONDS
                    ):
                        return False, "cooldown"

                cur.execute(
                    """
                    INSERT INTO password_reset_codes (
                        username, email, code_hash, expires_at, attempts_left, requested_at, consumed_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, NULL)
                    ON CONFLICT (username) DO UPDATE
                      SET email = EXCLUDED.email,
                          code_hash = EXCLUDED.code_hash,
                          expires_at = EXCLUDED.expires_at,
                          attempts_left = EXCLUDED.attempts_left,
                          requested_at = EXCLUDED.requested_at,
                          consumed_at = EXCLUDED.consumed_at
                    """,
                    (
                        username,
                        email_normalizado,
                        codigo_hash,
                        agora + timedelta(minutes=ttl_minutes),
                        PASSWORD_RESET_ATTEMPTS,
                        agora,
                    ),
                )

    try:
        send_password_reset_code_email(
            to_email=email_normalizado,
            username=nome,
            code=codigo,
            expires_in_minutes=ttl_minutes,
        )
    except Exception:
        logger.exception(
            "Falha ao enviar codigo de recuperacao para o usuario '%s'.", username
        )
        with _LOCK:
            with get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE password_reset_codes
                        SET consumed_at = %s
                        WHERE username = %s AND consumed_at IS NULL
                        """,
                        (datetime.now(timezone.utc), username),
                    )
        return False, "email_failed"

    return True, "sent"


def confirmar_codigo_recuperacao(
    username: str,
    email: str,
    code: str,
    nova_senha: str,
) -> tuple[bool, str]:
    username = username.strip()
    email_normalizado = _normalizar_email(email)
    code = code.strip()

    if not username or not _email_valido(email_normalizado):
        return False, "Informe um usuario e e-mail validos."
    if not re.fullmatch(r"\d{6}", code):
        return False, "Informe o codigo de 6 digitos enviado por e-mail."
    if len(nova_senha) < 6:
        return False, "A nova senha deve ter pelo menos 6 caracteres."

    agora = datetime.now(timezone.utc)
    with _LOCK:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT username, email, code_hash, expires_at, attempts_left
                    FROM password_reset_codes
                    WHERE username = %s AND consumed_at IS NULL
                    ORDER BY requested_at DESC
                    LIMIT 1
                    """,
                    (username,),
                )
                reset_row = cur.fetchone()
                if reset_row is None:
                    return False, "Solicite um novo codigo de recuperacao."

                stored_email = _normalizar_email(reset_row[1] or "")
                codigo_hash = reset_row[2] or ""
                expires_at = reset_row[3]
                attempts_left = int(reset_row[4] or 0)
                if isinstance(expires_at, str):
                    expires_at = datetime.fromisoformat(expires_at)

                if stored_email != email_normalizado:
                    return False, "Codigo invalido ou expirado."

                if expires_at and expires_at <= agora:
                    cur.execute(
                        """
                        UPDATE password_reset_codes
                        SET consumed_at = %s
                        WHERE username = %s AND consumed_at IS NULL
                        """,
                        (agora, username),
                    )
                    return False, "Codigo expirado. Solicite um novo codigo."

                codigo_informado_hash = _hash_codigo_recuperacao(
                    username, email_normalizado, code
                )
                if not secrets.compare_digest(codigo_informado_hash, codigo_hash):
                    attempts_left = max(attempts_left - 1, 0)
                    cur.execute(
                        """
                        UPDATE password_reset_codes
                        SET attempts_left = %s,
                            consumed_at = %s
                        WHERE username = %s AND consumed_at IS NULL
                        """,
                        (
                            attempts_left,
                            agora if attempts_left == 0 else None,
                            username,
                        ),
                    )
                    if attempts_left == 0:
                        return False, "Codigo invalido. Solicite um novo codigo."
                    return (
                        False,
                        f"Codigo invalido. Restam {attempts_left} tentativa(s).",
                    )

                novo_salt = secrets.token_hex(32)
                nova_hash = _hash_senha(novo_salt, nova_senha)
                cur.execute(
                    """
                    UPDATE users
                    SET salt = %s,
                        senha_hash = %s
                    WHERE username = %s
                    """,
                    (novo_salt, nova_hash, username),
                )
                cur.execute(
                    """
                    UPDATE password_reset_codes
                    SET attempts_left = 0,
                        consumed_at = %s
                    WHERE username = %s AND consumed_at IS NULL
                    """,
                    (agora, username),
                )
                return True, "Senha atualizada com sucesso."
