from datetime import datetime, timedelta, timezone
import logging
import os
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from auth import (
    aprovar_usuario,
    carregar_pending,
    confirmar_codigo_recuperacao,
    get_user,
    registrar_usuario,
    rejeitar_usuario,
    solicitar_codigo_recuperacao,
    verificar_login,
)

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "").strip()
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY precisa estar definido no ambiente.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
PASSWORD_RECOVERY_REQUEST_MESSAGE = (
    "Se os dados informados estiverem corretos, enviaremos um codigo de recuperacao por e-mail."
)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    nome: str | None = None
    funcionalidade: str = "administracao geral"


class PasswordRecoveryRequest(BaseModel):
    username: str
    email: str


class PasswordRecoveryConfirmRequest(BaseModel):
    username: str
    email: str
    code: str
    new_password: str


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload.update({"exp": expire})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _is_admin_user(current_user: dict | None) -> bool:
    if not isinstance(current_user, dict):
        return False
    return bool(
        current_user.get("role") == "admin" or current_user.get("is_admin") is True
    )


def _require_admin(current_user: dict) -> None:
    if not _is_admin_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem executar esta acao.",
        )


def _serialize_pending_entry(entry: dict) -> dict:
    solicitado_em = entry.get("solicitado_em")
    if isinstance(solicitado_em, datetime):
        solicitado_em = solicitado_em.isoformat()
    return {
        "username": entry.get("username"),
        "nome": entry.get("nome"),
        "email": entry.get("email"),
        "funcionalidade": entry.get("funcionalidade", "administracao geral"),
        "solicitado_em": solicitado_em,
    }


def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais invalidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = get_user(username)
    if user is None:
        raise credentials_exception
    return user


@router.post("/login")
def login(payload: LoginRequest):
    ok, motivo = verificar_login(payload.username, payload.password)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=motivo,
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_user(payload.username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario nao encontrado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        {"sub": payload.username, "role": user.get("role", "operacional")}
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register")
def register(payload: RegisterRequest):
    nome = payload.nome or payload.username
    ok, resultado = registrar_usuario(
        username=payload.username,
        email=payload.email,
        nome=nome,
        senha=payload.password,
        funcionalidade=payload.funcionalidade,
    )
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=resultado)
    return {"success": True, "status": resultado}


@router.post("/password-recovery/request")
def password_recovery_request(payload: PasswordRecoveryRequest):
    try:
        solicitar_codigo_recuperacao(payload.username, payload.email)
    except Exception:
        logger.exception("Falha ao solicitar recuperacao de senha.")
    return {
        "success": True,
        "message": PASSWORD_RECOVERY_REQUEST_MESSAGE,
    }


@router.post("/password-recovery/confirm")
def password_recovery_confirm(payload: PasswordRecoveryConfirmRequest):
    ok, message = confirmar_codigo_recuperacao(
        username=payload.username,
        email=payload.email,
        code=payload.code,
        nova_senha=payload.new_password,
    )
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return {"success": True, "message": message}


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user.get("username"),
        "nome": current_user.get("nome"),
        "email": current_user.get("email"),
        "role": current_user.get("role", "operacional"),
        "is_admin": _is_admin_user(current_user),
        "funcionalidade": current_user.get("funcionalidade", "administracao geral"),
    }


@router.get("/admin/pending")
def list_pending(current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    pending_entries = carregar_pending()
    return {
        "count": len(pending_entries),
        "items": [_serialize_pending_entry(entry) for entry in pending_entries],
    }


@router.post("/admin/pending/{username}/approve")
def approve_pending(username: str, current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    aprovado = aprovar_usuario(username)
    if not aprovado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitacao pendente nao encontrada.",
        )
    return {"success": True, "username": username, "action": "approved"}


@router.post("/admin/pending/{username}/reject")
def reject_pending(username: str, current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    rejeitado = rejeitar_usuario(username)
    if not rejeitado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitacao pendente nao encontrada.",
        )
    return {"success": True, "username": username, "action": "rejected"}
