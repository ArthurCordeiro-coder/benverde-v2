import os
import uuid
from pathlib import Path

from fastapi import Body, Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware

from api_auth import get_current_user, router as auth_router
from data_processor import (
    calcular_estoque,
    extrair_bananas_pdf_upload,
    deletar_movimentacao_manual,
    load_movimentacoes_manuais,
    load_registros_caixas,
    salvar_movimentacao_manual,
    salvar_registro_caixas,
)

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
