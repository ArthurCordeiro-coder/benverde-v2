"use client";

// Extrai os PDFs de dentro de um arquivo .zip, no próprio navegador (fflate).
// Ignora entradas de diretório, arquivos ocultos e o lixo de metadados que o
// macOS coloca em zips (__MACOSX / ._arquivo).

import { unzip } from "fflate";

function ehPdfUtil(caminho: string): boolean {
  const nome = caminho.split("/").pop() ?? caminho;
  if (!nome.toLowerCase().endsWith(".pdf")) return false;
  if (caminho.includes("__MACOSX")) return false;
  if (nome.startsWith(".") || nome.startsWith("._")) return false;
  return true;
}

export async function extrairPdfsDeZip(file: File): Promise<File[]> {
  const dados = new Uint8Array(await file.arrayBuffer());

  const entradas = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(dados, { filter: (entry) => ehPdfUtil(entry.name) }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  return Object.entries(entradas)
    .filter(([, bytes]) => bytes.length > 0)
    .map(([caminho, bytes]) => {
      const nome = caminho.split("/").pop() || caminho;
      return new File([bytes as BlobPart], nome, { type: "application/pdf" });
    });
}
