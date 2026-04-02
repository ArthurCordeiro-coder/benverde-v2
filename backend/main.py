from dotenv import load_dotenv

load_dotenv()

import logging
from multiprocessing import Process
import os
import re
import shutil
import unicodedata
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
from db import (
    clear_cache_table,
    clear_pedidos_importados,
    create_import_job,
    fetch_pedidos_importados,
    get_import_job,
    load_metas,
    replace_metas,
    update_import_job,
)

app = FastAPI(title="Benverde API")
logger = logging.getLogger(__name__)
IMPORT_JOBS_ROOT = Path(__file__).resolve().parent / "temp_import_jobs"
DASHBOARD_CATEGORY_ORDER = ("Frutas", "Legumes", "Verduras")
_CATEGORY_KEYWORDS = {
    "Frutas": (
        "BANANA",
        "MACA",
        "MAMAO",
        "PERA",
        "UVA",
        "MELAO",
        "MELANCIA",
        "LARANJA",
        "LIMAO",
        "ABACATE",
        "ABACAXI",
        "MANGA",
        "MORANGO",
        "KIWI",
        "GOIABA",
    ),
    "Legumes": (
        "BATATA",
        "CENOURA",
        "BERINJELA",
        "MANDIOCA",
        "BETERRABA",
        "ABOBORA",
        "ABOBRINHA",
        "CHUCHU",
        "PEPINO",
        "CEBOLA",
        "ALHO",
        "INHAME",
        "MANDIOQUINHA",
        "PIMENTAO",
        "TOMATE",
        "VAGEM",
        "MILHO",
    ),
    "Verduras": (
        "ALFACE",
        "MANJERICAO",
        "MOSTARDA",
        "RUCULA",
        "COUVE",
        "ESPINAFRE",
        "AGRIAO",
        "ALMEIRAO",
        "SALSINHA",
        "CEBOLINHA",
        "COENTRO",
        "HORTELA",
        "REPOLHO",
        "ESCAROLA",
    ),
}


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


def _normalize_text(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or "").strip().upper())
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = re.sub(r"[^A-Z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _infer_dashboard_category(produto: str, categoria: object | None = None) -> str:
    normalized_category = _normalize_text(categoria)
    category_map = {
        "FRUTA": "Frutas",
        "FRUTAS": "Frutas",
        "LEGUME": "Legumes",
        "LEGUMES": "Legumes",
        "VERDURA": "Verduras",
        "VERDURAS": "Verduras",
    }
    if normalized_category in category_map:
        return category_map[normalized_category]

    normalized_product = _normalize_text(produto)
    for category, keywords in _CATEGORY_KEYWORDS.items():
        if any(keyword in normalized_product for keyword in keywords):
            return category
    return "Frutas"


def _meta_matches_product(meta_name: str, imported_product: str) -> bool:
    if not meta_name or not imported_product:
        return False
    if meta_name == imported_product:
        return True
    if imported_product.startswith(f"{meta_name} "):
        return True
    if f" {meta_name} " in f" {imported_product} ":
        return True
    return meta_name.startswith(f"{imported_product} ")


def _build_dashboard_meta_items() -> list[dict]:
    raw_metas = load_metas()
    base_items: list[dict] = []
    seen_products: set[str] = set()

    for index, raw_meta in enumerate(raw_metas, start=1):
        produto = str(raw_meta.get("Produto") or raw_meta.get("produto") or "").strip()
        if not produto:
            continue

        normalized_product = _normalize_text(produto)
        if not normalized_product or normalized_product in seen_products:
            continue

        try:
            meta_value = int(float(raw_meta.get("Meta") or raw_meta.get("meta") or 0))
        except (TypeError, ValueError):
            meta_value = 0

        if meta_value <= 0:
            continue

        seen_products.add(normalized_product)
        base_items.append(
            {
                "id": index,
                "produto": produto,
                "categoria": _infer_dashboard_category(
                    produto,
                    raw_meta.get("Categoria") or raw_meta.get("categoria"),
                ),
                "meta": meta_value,
                "_normalized": normalized_product,
            }
        )

    if not base_items:
        return []

    aggregated_orders = {item["_normalized"]: 0.0 for item in base_items}
    normalized_targets = sorted(
        [(item["_normalized"], item["produto"]) for item in base_items],
        key=lambda current: len(current[0]),
        reverse=True,
    )

    for imported_order in fetch_pedidos_importados():
        normalized_product = _normalize_text(
            imported_order.get("Produto") or imported_order.get("produto")
        )
        if not normalized_product:
            continue

        try:
            quantity = float(imported_order.get("QUANT") or imported_order.get("quant") or 0)
        except (TypeError, ValueError):
            quantity = 0.0

        if quantity <= 0:
            continue

        matched_meta = next(
            (
                normalized_meta
                for normalized_meta, _ in normalized_targets
                if _meta_matches_product(normalized_meta, normalized_product)
            ),
            None,
        )
        if matched_meta is None:
            continue

        aggregated_orders[matched_meta] += quantity

    items: list[dict] = []
    for item in base_items:
        pedido = round(aggregated_orders.get(item["_normalized"], 0.0), 2)
        progresso = (pedido / item["meta"]) * 100 if item["meta"] > 0 else 0.0
        status_label = "Pendente"
        if progresso >= 100:
            status_label = "Atingida"
        elif progresso >= 80:
            status_label = "Proxima"

        items.append(
            {
                "id": item["id"],
                "produto": item["produto"],
                "categoria": item["categoria"],
                "meta": item["meta"],
                "pedido": pedido,
                "progresso": round(progresso, 2),
                "status": status_label,
            }
        )

    return items


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


@app.get("/api/dashboard/summary")
def get_dashboard_summary(current_user: dict = Depends(get_current_user)):
    saldo_estoque, _ = calcular_estoque()

    caixas_df = load_registros_caixas()
    caixas_registradas = int(len(caixas_df.index))
    caixas_disponiveis = 0
    if not caixas_df.empty:
        caixas_disponiveis = int(
            caixas_df["total"].fillna(0).astype(int).sum()
            if "total" in caixas_df.columns
            else 0
        )

    pasta_precos = Path(__file__).resolve().parent / "dados" / "precos"
    precos = listar_precos_consolidados(str(pasta_precos))
    precos_registrados = len(precos)
    preco_values = []
    for item in precos:
        try:
            price = float(item.get("Preco") or item.get("preco") or 0)
        except (TypeError, ValueError):
            price = 0.0
        if price > 0:
            preco_values.append(price)
    preco_medio = sum(preco_values) / len(preco_values) if preco_values else 0.0

    metas = _build_dashboard_meta_items()
    media_entrega = (
        sum(float(item["progresso"]) for item in metas) / len(metas) if metas else 0.0
    )

    return {
        "summary": {
            "saldoEstoque": round(float(saldo_estoque or 0), 2),
            "caixasDisponiveis": caixas_disponiveis,
            "precoMedio": round(preco_medio, 2),
            "caixasRegistradas": caixas_registradas,
            "precosRegistrados": precos_registrados,
            "metasAtivas": len(metas),
            "mediaEntrega": round(media_entrega, 2),
            "pedidosImportados": len(fetch_pedidos_importados()),
        },
        "metas": metas,
    }


@app.put("/api/dashboard/metas")
def put_dashboard_metas(
    payload: dict | list = Body(...), current_user: dict = Depends(get_current_user)
):
    items = payload if isinstance(payload, list) else payload.get("items")
    if not isinstance(items, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Envie uma lista de metas.",
        )

    by_product: dict[str, dict] = {}
    for raw_item in items:
        if not isinstance(raw_item, dict):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cada meta precisa ser um objeto JSON.",
            )

        produto = str(raw_item.get("produto") or raw_item.get("Produto") or "").strip()
        if not produto:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Toda meta precisa informar o produto.",
            )

        try:
            meta_value = int(float(raw_item.get("meta") or raw_item.get("Meta") or 0))
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Meta invalida para o produto {produto}.",
            ) from exc

        if meta_value <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A meta do produto {produto} deve ser maior que zero.",
            )

        normalized_product = _normalize_text(produto)
        by_product[normalized_product] = {
            "Produto": produto,
            "Meta": meta_value,
            "Categoria": _infer_dashboard_category(
                produto,
                raw_item.get("categoria") or raw_item.get("Categoria"),
            ),
        }

    replace_metas(list(by_product.values()))
    return {"success": True, "items": jsonable_encoder(_build_dashboard_meta_items())}


@app.delete("/api/dashboard/pedidos/importados")
def delete_dashboard_imported_orders(current_user: dict = Depends(get_current_user)):
    is_admin = bool(
        current_user.get("role") == "admin" or current_user.get("is_admin") is True
    )
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem limpar pedidos importados.",
        )

    clear_pedidos_importados()
    clear_cache_table("cache_pedidos")
    return {"success": True}


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
