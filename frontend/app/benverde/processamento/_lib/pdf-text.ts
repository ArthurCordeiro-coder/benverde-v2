"use client";

// Extração da camada de texto do PDF no navegador, via pdf.js.
// O parsing pesado roda no worker próprio do pdf.js (workerSrc abaixo), então a
// thread principal da UI não trava. Reaproveita a lógica de agrupamento por
// coordenada usada no servidor em lib/server/mita-pdf.ts (extractPdfText).

import type { Fragmento, PaginaPdf } from "./types";

type PdfjsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfjsModule> | null = null;

async function getPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      // Worker servido de /public (copiado de pdfjs-dist/build/pdf.worker.min.mjs).
      mod.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return mod;
    });
  }
  return pdfjsPromise;
}

/**
 * Lê um PDF e devolve cada página com: `texto` (linhas reconstruídas por y,
 * fragmentos ordenados por x) e `linhas` (fragmentos posicionados, para o
 * caminho de tabela do parser). Retorna [] se o PDF não tiver camada de texto.
 */
export async function extrairPaginas(file: File): Promise<PaginaPdf[]> {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data, useSystemFonts: true });
  const doc = await loadingTask.promise;

  try {
    const paginas: PaginaPdf[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const conteudo = await page.getTextContent();

      const porLinha = new Map<number, Fragmento[]>();
      for (const item of conteudo.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const y = Math.round(item.transform[5]);
        const grupo = porLinha.get(y) ?? [];
        grupo.push({ x: item.transform[4], trecho: item.str });
        porLinha.set(y, grupo);
      }

      const ys = Array.from(porLinha.keys()).sort((a, b) => b - a);
      const linhas: Fragmento[][] = [];
      let texto = "";
      for (const y of ys) {
        const fragmentos = (porLinha.get(y) ?? []).slice().sort((a, b) => a.x - b.x);
        linhas.push(fragmentos);
        texto += fragmentos.map((f) => f.trecho).join(" ") + "\n";
      }
      paginas.push({ texto: texto.trim(), linhas });
    }
    return paginas;
  } finally {
    await loadingTask.destroy();
  }
}
