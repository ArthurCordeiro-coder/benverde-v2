from dotenv import load_dotenv

load_dotenv()

import logging
from multiprocessing import Process
import os
import shutil
import uuid
import zipfile
from datetime import datetime
from pathlib import Path

from fastapi import Body, Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware

from api_auth import get_current_user, router as auth_router
from data_processor import (
    calcular_estoque,
    deletar_movimentacao_manual,
    extrair_bananas_pdf_upload,
    listar_precos_consolidados,
    load_movimentacoes_manuais,
    load_registros_caixas,
    run_import_job,
    salvar_movimentacao_manual,
    salvar_registro_caixas,
)
from db import create_import_job, get_import_job, update_import_job

app = FastAPI(title="Benverde API")
logger = logging.getLogger(__name__)
IMPORT_JOBS_ROOT = Path(__file__).resolve().parent / "temp_import_jobs"


def get_allowed_origins() -> list[str]:
    allowed_origins = os.environ.get("ALLOWED_ORIGINS", "")
    origins = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]
    return origins or ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


def _serialize_import_job(job: dict) -> dict:
    total_files = max(0, int(job.get("total_files") or 0))
    processed_files = max(0, int(job.get("processed_files") or 0))
    saved_records = max(0, int(job.get("saved_records") or 0))
    remaining_files = max(0, total_files - processed_files)

    started_at = job.get("started_at")
    finished_at = job.get("finished_at")
    now = datetime.now(started_at.tzinfo) if started_at is not None else datetime.now()
    reference_time = finished_at or now
    elapsed_seconds = None
    if started_at is not None:
        elapsed_seconds = max(0, int((reference_time - started_at).total_seconds()))

    eta_seconds = None
    if processed_files > 0 and elapsed_seconds is not None:
        media_por_arquivo = elapsed_seconds / processed_files
        eta_seconds = max(0, int(media_por_arquivo * remaining_files))
        if job.get("status") == "completed":
            eta_seconds = 0

    progress_percent = 0.0
    if total_files > 0:
        progress_percent = min(100.0, (processed_files / total_files) * 100)
    elif job.get("status") == "completed":
        progress_percent = 100.0

    return {
        "job_id": job.get("job_id"),
        "status": job.get("status"),
        "total_files": total_files,
        "processed_files": processed_files,
        "remaining_files": remaining_files,
        "saved_records": saved_records,
        "progress_percent": progress_percent,
        "eta_seconds": eta_seconds,
        "elapsed_seconds": elapsed_seconds,
        "current_file": job.get("current_file"),
        "error_message": job.get("error_message"),
        "recent_logs": list(job.get("recent_logs") or []),
        "started_at": started_at.isoformat() if started_at else None,
        "last_heartbeat_at": (
            job["last_heartbeat_at"].isoformat() if job.get("last_heartbeat_at") else None
        ),
        "finished_at": finished_at.isoformat() if finished_at else None,
    }


@app.get("/api/estoque/saldo")
def get_estoque_saldo(current_user: dict = Depends(get_current_user)):
    saldo, historico = calcular_estoque()
    return {
        "saldo": saldo,
        "historico": jsonable_encoder(historico),
    }


@app.get("/api/estoque/movimentacoes")
def get_movimentacoes(current_user: dict = Depends(get_current_user)):
    movimentacoes = load_movimentacoes_manuais(caminho_json="")
    return jsonable_encoder(movimentacoes)


@app.post("/api/estoque/movimentacao")
def post_movimentacao(
    payload: dict | list = Body(...), current_user: dict = Depends(get_current_user)
):
    if isinstance(payload, dict):
        registros = [payload]
    elif isinstance(payload, list):
        registros = payload
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload deve ser objeto ou lista de objetos.",
        )

    salvar_movimentacao_manual(registros=registros, caminho_json="")
    return {"success": True, "saved": len(registros)}


@app.delete("/api/estoque/movimentacao/{id}")
def delete_movimentacao(id: int, current_user: dict = Depends(get_current_user)):
    deletar_movimentacao_manual(entry_id=id, caminho_json="")
    return {"success": True, "deleted_id": id}


@app.get("/api/caixas")
def get_caixas(current_user: dict = Depends(get_current_user)):
    df = load_registros_caixas()
    return jsonable_encoder(df.to_dict(orient="records"))


@app.post("/api/caixas")
def post_caixas(payload: dict, current_user: dict = Depends(get_current_user)):
    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload deve ser um objeto JSON.",
        )
    salvar_registro_caixas(payload)
    return {"success": True}


@app.get("/api/precos")
def get_precos(current_user: dict = Depends(get_current_user)):
    pasta_precos = Path(__file__).resolve().parent / "dados" / "precos"
    precos = listar_precos_consolidados(str(pasta_precos))
    return jsonable_encoder(precos)


@app.post("/api/upload/pedidos", status_code=status.HTTP_202_ACCEPTED)
async def upload_pedidos(
    files: list[UploadFile] = File(...), current_user: dict = Depends(get_current_user)
):
    is_admin = bool(
        current_user.get("role") == "admin" or current_user.get("is_admin") is True
    )
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem importar pedidos.",
        )

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Envie ao menos um arquivo PDF ou ZIP.",
        )

    try:
        job_id = uuid.uuid4().hex
        job_dir = IMPORT_JOBS_ROOT / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        pdf_paths: list[str] = []

        for file in files:
            filename = Path(file.filename or "").name
            if not filename:
                continue

            lower_name = filename.lower()
            if not lower_name.endswith((".pdf", ".zip")):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Formato nao suportado: {filename}",
                )

            staged_path = job_dir / f"{uuid.uuid4().hex}_{filename}"
            with open(staged_path, "wb") as out_file:
                while True:
                    chunk = await file.read(1024 * 1024)
                    if not chunk:
                        break
                    out_file.write(chunk)

            if lower_name.endswith(".pdf"):
                pdf_paths.append(str(staged_path))
                continue

            try:
                with zipfile.ZipFile(staged_path) as zip_file:
                    for member in zip_file.infolist():
                        if member.is_dir():
                            continue

                        member_name = Path(member.filename).name
                        if not member_name.lower().endswith(".pdf"):
                            continue

                        extracted_path = job_dir / f"{uuid.uuid4().hex}_{member_name}"
                        with zip_file.open(member) as source, open(
                            extracted_path, "wb"
                        ) as target:
                            shutil.copyfileobj(source, target)
                        pdf_paths.append(str(extracted_path))
            except zipfile.BadZipFile as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Arquivo ZIP invalido: {filename}",
                ) from exc
            finally:
                if staged_path.exists():
                    staged_path.unlink(missing_ok=True)

        if not pdf_paths:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nenhum PDF valido encontrado para processamento.",
            )

        create_import_job(
            job_id,
            total_files=len(pdf_paths),
            recent_logs=[f"Upload recebido com {len(pdf_paths)} arquivo(s) para processamento."],
        )

        process = Process(
            target=run_import_job,
            args=(job_id, pdf_paths, str(job_dir)),
            daemon=True,
        )
        try:
            process.start()
        except Exception:
            update_import_job(
                job_id,
                status="failed",
                error_message="Nao foi possivel iniciar o processo em background.",
                touch_heartbeat=True,
                finished=True,
            )
            raise

        job = get_import_job(job_id)
        if job is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Nao foi possivel iniciar o job de importacao.",
            )
        return _serialize_import_job(job)
    except HTTPException:
        if "job_dir" in locals() and job_dir.exists():
            shutil.rmtree(job_dir, ignore_errors=True)
        raise
    except Exception as exc:
        logger.exception("Falha ao processar upload de pedidos")
        if "job_dir" in locals() and job_dir.exists():
            shutil.rmtree(job_dir, ignore_errors=True)
        detail = str(exc).strip() or "Falha interna ao processar upload de pedidos."
        raise HTTPException(status_code=500, detail=detail)
    finally:
        for file in files:
            await file.close()


@app.get("/api/upload/pedidos/{job_id}")
def get_upload_pedidos_status(job_id: str, current_user: dict = Depends(get_current_user)):
    is_admin = bool(
        current_user.get("role") == "admin" or current_user.get("is_admin") is True
    )
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem consultar importacoes de pedidos.",
        )

    job = get_import_job(job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Importacao nao encontrada.",
        )

    return _serialize_import_job(job)


@app.post("/api/upload/pdf")
async def upload_pdf(
    file: UploadFile = File(...), current_user: dict = Depends(get_current_user)
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Envie um arquivo PDF valido.",
        )

    temp_dir = Path(__file__).resolve().parent / "temp_uploads"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / f"{uuid.uuid4().hex}_{Path(file.filename).name}"

    try:
        with open(temp_path, "wb") as out_file:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                out_file.write(chunk)

        resultado = extrair_bananas_pdf_upload(str(temp_path))
        return {"arquivo": file.filename, "resultado": resultado}
    finally:
        await file.close()
        if temp_path.exists():
            os.remove(temp_path)
