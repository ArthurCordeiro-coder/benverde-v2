import hashlib
import importlib.util
import os
import sys
import types
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi import HTTPException


BACKEND_DIR = Path(__file__).resolve().parents[1]
AUTH_PATH = BACKEND_DIR / "auth.py"
API_AUTH_PATH = BACKEND_DIR / "api_auth.py"


class FakeCursor:
    def __init__(self, state: dict):
        self.state = state
        self._results = []
        self.rowcount = 0

    def execute(self, query: str, params=None):
        normalized = " ".join(query.split()).lower()
        params = params or ()
        self.rowcount = 0

        if (
            "select username, nome, email from users" in normalized
            and "lower(email) =" in normalized
        ):
            username, email = params
            user = self.state["users"].get(username)
            if user and user["email"].lower() == email:
                self._results = [(username, user["nome"], user["email"])]
            else:
                self._results = []
            return

        if (
            "select requested_at from password_reset_codes" in normalized
            and "expires_at >" in normalized
        ):
            username = params[0]
            entry = self.state["password_reset_codes"].get(username)
            if entry and entry["consumed_at"] is None and entry["expires_at"] > params[1]:
                self._results = [(entry["requested_at"],)]
            else:
                self._results = []
            return

        if "insert into password_reset_codes" in normalized:
            (
                username,
                email,
                code_hash,
                expires_at,
                attempts_left,
                requested_at,
            ) = params
            self.state["password_reset_codes"][username] = {
                "username": username,
                "email": email,
                "code_hash": code_hash,
                "expires_at": expires_at,
                "attempts_left": attempts_left,
                "requested_at": requested_at,
                "consumed_at": None,
            }
            self.rowcount = 1
            self._results = []
            return

        if (
            "update password_reset_codes" in normalized
            and "set consumed_at = %s" in normalized
            and "attempts_left" not in normalized
        ):
            consumed_at, username = params
            entry = self.state["password_reset_codes"].get(username)
            if entry and entry["consumed_at"] is None:
                entry["consumed_at"] = consumed_at
                self.rowcount = 1
            self._results = []
            return

        if "select username, email, code_hash, expires_at, attempts_left" in normalized:
            username = params[0]
            entry = self.state["password_reset_codes"].get(username)
            if entry and entry["consumed_at"] is None:
                self._results = [
                    (
                        entry["username"],
                        entry["email"],
                        entry["code_hash"],
                        entry["expires_at"],
                        entry["attempts_left"],
                    )
                ]
            else:
                self._results = []
            return

        if (
            "update password_reset_codes" in normalized
            and "set attempts_left = %s" in normalized
            and "consumed_at = %s" in normalized
        ):
            attempts_left, consumed_at, username = params
            entry = self.state["password_reset_codes"].get(username)
            if entry and entry["consumed_at"] is None:
                entry["attempts_left"] = attempts_left
                entry["consumed_at"] = consumed_at
                self.rowcount = 1
            self._results = []
            return

        if "update users set salt = %s" in normalized:
            salt, senha_hash, username = params
            user = self.state["users"].get(username)
            if user:
                user["salt"] = salt
                user["senha_hash"] = senha_hash
                self.rowcount = 1
            self._results = []
            return

        if "select tentativas, bloqueado_ate from lockouts" in normalized:
            username = params[0]
            lockout = self.state["lockouts"].get(username)
            self._results = (
                [(lockout["tentativas"], lockout["bloqueado_ate"])] if lockout else []
            )
            return

        if "insert into lockouts" in normalized:
            username, tentativas, bloqueado_ate = params
            self.state["lockouts"][username] = {
                "tentativas": tentativas,
                "bloqueado_ate": bloqueado_ate,
            }
            self.rowcount = 1
            self._results = []
            return

        if "select username, salt, senha_hash, funcionalidade from users" in normalized:
            username = params[0]
            user = self.state["users"].get(username)
            self._results = (
                [(username, user["salt"], user["senha_hash"], user["funcionalidade"])]
                if user
                else []
            )
            return

        raise AssertionError(f"Query nao suportada no teste: {normalized}")

    def fetchone(self):
        return self._results[0] if self._results else None

    def fetchall(self):
        return list(self._results)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class FakeConnection:
    def __init__(self, state: dict):
        self.state = state

    def cursor(self):
        return FakeCursor(self.state)

    def commit(self):
        return None

    def rollback(self):
        return None

    def close(self):
        return None


def _load_module(module_name: str, module_path: Path):
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def loaded_modules():
    os.environ["JWT_SECRET_KEY"] = "jwt-test-secret"
    os.environ["PASSWORD_RESET_PEPPER"] = "reset-pepper"
    os.environ["RESET_CODE_TTL_MINUTES"] = "15"

    state = {
        "users": {
            "operador": {
                "nome": "Operador Teste",
                "email": "operador@lumii.com",
                "salt": "salt-antigo",
                "senha_hash": hashlib.sha256(("salt-antigo" + "senha123").encode()).hexdigest(),
                "funcionalidade": "administracao geral",
            }
        },
        "password_reset_codes": {},
        "lockouts": {},
    }

    sent_emails: list[dict] = []

    fake_db = types.ModuleType("db")

    @contextmanager
    def get_connection():
        yield FakeConnection(state)

    fake_db.get_connection = get_connection
    sys.modules["db"] = fake_db

    fake_mailer = types.ModuleType("mailer")

    def send_password_reset_code_email(to_email, username, code, expires_in_minutes):
        sent_emails.append(
            {
                "to_email": to_email,
                "username": username,
                "code": code,
                "expires_in_minutes": expires_in_minutes,
            }
        )

    fake_mailer.send_password_reset_code_email = send_password_reset_code_email
    sys.modules["mailer"] = fake_mailer

    sys.modules.pop("auth", None)
    sys.modules.pop("api_auth", None)
    auth = _load_module("auth", AUTH_PATH)
    api_auth = _load_module("api_auth", API_AUTH_PATH)

    yield {
        "auth": auth,
        "api_auth": api_auth,
        "state": state,
        "sent_emails": sent_emails,
    }

    for module_name in ("auth", "api_auth", "db", "mailer"):
        sys.modules.pop(module_name, None)


def test_request_endpoint_returns_generic_message_for_unknown_user(loaded_modules):
    api_auth = loaded_modules["api_auth"]

    payload = api_auth.PasswordRecoveryRequest(
        username="desconhecido",
        email="desconhecido@lumii.com",
    )

    response = api_auth.password_recovery_request(payload)

    assert response["success"] is True
    assert "codigo de recuperacao" in response["message"].lower()
    assert loaded_modules["sent_emails"] == []


def test_request_creates_code_and_sends_email(loaded_modules):
    auth = loaded_modules["auth"]
    state = loaded_modules["state"]
    sent_emails = loaded_modules["sent_emails"]

    ok, status = auth.solicitar_codigo_recuperacao(
        "operador", "operador@lumii.com"
    )

    assert ok is True
    assert status == "sent"
    assert len(sent_emails) == 1
    stored = state["password_reset_codes"]["operador"]
    assert stored["attempts_left"] == auth.PASSWORD_RESET_ATTEMPTS
    assert stored["consumed_at"] is None
    assert sent_emails[0]["code"].isdigit()
    assert len(sent_emails[0]["code"]) == 6


def test_confirm_updates_password_and_allows_login(loaded_modules):
    auth = loaded_modules["auth"]
    sent_emails = loaded_modules["sent_emails"]

    auth.solicitar_codigo_recuperacao("operador", "operador@lumii.com")
    code = sent_emails[0]["code"]

    ok, message = auth.confirmar_codigo_recuperacao(
        "operador",
        "operador@lumii.com",
        code,
        "novaSenha456",
    )

    assert ok is True
    assert "sucesso" in message.lower()
    login_ok, login_message = auth.verificar_login("operador", "novaSenha456")
    assert login_ok is True
    assert login_message == "ok"


def test_confirm_rejects_expired_code(loaded_modules):
    auth = loaded_modules["auth"]
    sent_emails = loaded_modules["sent_emails"]
    state = loaded_modules["state"]

    auth.solicitar_codigo_recuperacao("operador", "operador@lumii.com")
    state["password_reset_codes"]["operador"]["expires_at"] = datetime.now(
        timezone.utc
    ) - timedelta(minutes=1)

    ok, message = auth.confirmar_codigo_recuperacao(
        "operador",
        "operador@lumii.com",
        sent_emails[0]["code"],
        "novaSenha456",
    )

    assert ok is False
    assert "expirado" in message.lower()


def test_confirm_invalid_code_consumes_after_five_attempts(loaded_modules):
    auth = loaded_modules["auth"]
    state = loaded_modules["state"]

    auth.solicitar_codigo_recuperacao("operador", "operador@lumii.com")

    final_message = ""
    for _ in range(5):
        ok, final_message = auth.confirmar_codigo_recuperacao(
            "operador",
            "operador@lumii.com",
            "000000",
            "novaSenha456",
        )
        assert ok is False

    assert "solicite um novo codigo" in final_message.lower()
    assert state["password_reset_codes"]["operador"]["consumed_at"] is not None


def test_confirm_endpoint_returns_http_400_for_invalid_code(loaded_modules):
    api_auth = loaded_modules["api_auth"]
    auth = loaded_modules["auth"]

    auth.solicitar_codigo_recuperacao("operador", "operador@lumii.com")
    payload = api_auth.PasswordRecoveryConfirmRequest(
        username="operador",
        email="operador@lumii.com",
        code="111111",
        new_password="novaSenha456",
    )

    with pytest.raises(HTTPException) as exc_info:
        api_auth.password_recovery_confirm(payload)

    assert exc_info.value.status_code == 400

