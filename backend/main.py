from dotenv import load_dotenv

load_dotenv()

import logging
import os
import shutil
import tempfile
import uuid
import zipfile
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
    processar_pedidos_upload,
    salvar_movimentacao_manual,
    salvar_registro_caixas,
)

logger = logging.getLogger(__name__)

app = FastAPI(title="Benverde API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/api/estoque/saldo")
def get_estoque_saldo(current_user: dict = Depends(get_current_user)):
    pasta_entradas = Path(__file__).resolve().parent / "dados" / "entradas_bananas"
    pasta_saidas = Path(__file__).resolve().parent / "dados" / "saidas_bananas"
    saldo, historico = calcular_estoque(
        pasta_entradas=str(pasta_entradas),
        pasta_saidas=str(pasta_saidas),
    )
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


@app.post("/api/upload/pedidos")
async def upload_pedidos(
    files: list[UploadFile] = File(...), current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "admin":
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
        with tempfile.TemporaryDirectory(prefix="benverde_pedidos_") as temp_dir_name:
            temp_dir = Path(temp_dir_name)
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

                temp_path = temp_dir / f"{uuid.uuid4().hex}_{filename}"
                with open(temp_path, "wb") as out_file:
                    while True:
                        chunk = await file.read(1024 * 1024)
                        if not chunk:
                            break
                        out_file.write(chunk)

                if lower_name.endswith(".pdf"):
                    pdf_paths.append(str(temp_path))
                    continue

                try:
                    with zipfile.ZipFile(temp_path) as zip_file:
                        for member in zip_file.infolist():
                            if member.is_dir():
                                continue

                            member_name = Path(member.filename).name
                            if not member_name.lower().endswith(".pdf"):
                                continue

                            extracted_path = temp_dir / f"{uuid.uuid4().hex}_{member_name}"
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

            if not pdf_paths:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Nenhum PDF valido encontrado para processamento.",
                )

            resultado = processar_pedidos_upload(pdf_paths)
            if resultado.get("saved_records", 0) == 0:
                logger.warning(
                    "Upload de pedidos concluido sem itens validos salvos para %d arquivo(s).",
                    len(pdf_paths),
                )
            return resultado
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Falha ao processar upload de pedidos")
        detail = str(exc).strip() or "Falha interna ao processar upload de pedidos."
        raise HTTPException(status_code=500, detail=detail)
    finally:
        for file in files:
            await file.close()


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
