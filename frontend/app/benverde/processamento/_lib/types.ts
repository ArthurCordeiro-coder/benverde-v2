// Tipos do processamento de PDFs no navegador.
// `RegistroPedido` espelha exatamente a saida de `carregar_registros_upload_pdf`
// do app desktop (processor.py) e o formato esperado pela rota /api/pedidos.

export type RegistroPedido = {
  ARQUIVO: string;
  Data: string | null; // ISO 8601 ou null quando a data nao foi identificada
  Loja: string;
  Produto: string;
  UNID: string;
  QUANT: number;
  "VALOR TOTAL": number;
  "VALOR UNIT": number;
};

// Produto cru extraido de uma DANFE antes da normalizacao final.
export type ProdutoExtraido = {
  produto: string;
  quant: number;
  unidade: string;
  valor_unit: number;
  valor_total: number;
};

// Fragmento de texto posicionado (item do pdf.js), agrupado por linha.
export type Fragmento = { x: number; trecho: string };

// Uma pagina do PDF reconstruida: texto plano + linhas posicionadas (por y).
export type PaginaPdf = {
  texto: string;
  linhas: Fragmento[][];
};

// Resultado da extracao de um arquivo, ja com os registros prontos para envio.
export type ResultadoArquivo = {
  arquivo: string;
  registros: RegistroPedido[];
  erro?: string;
};
