export type LojaCatalogItem = {
  id: number;
  nome: string;
  label: string;
};

const RAW_LOJAS: Array<[number, string]> = [
  [1, "SUZANO"],
  [4, "SÃO PAULO"],
  [5, "GUAIANAZES"],
  [6, "MAUA"],
  [7, "MOGI DAS CRUZES"],
  [8, "MOGI DAS CRUZES"],
  [10, "TAUBATE"],
  [11, "PINDAMONHANGABA"],
  [12, "SÃO SEBASTIÃO"],
  [13, "CARAGUATATUBA"],
  [14, "UBATUBA"],
  [16, "PINDAMONHANGABA"],
  [17, "POÁ"],
  [18, "TAUBATE"],
  [19, "NOVA LORENA"],
  [20, "GUARATINGUETA"],
  [21, "BERTIOGA"],
  [22, "MOGI DAS CRUZES"],
  [23, "FERRAZ DE VASCONCELOS"],
  [25, "SÃO SEBASTIÃO"],
  [26, "UBATUBA"],
  [27, "SUZANO"],
  [29, "ARUJA"],
  [30, "SÃO JOSÉ DOS CAMPOS"],
  [31, "SUZANO"],
  [32, "ITAQUAQUECETUBA"],
  [33, "ITAQUAQUECETUBA"],
];

export const LOJAS_SISTEMA: LojaCatalogItem[] = RAW_LOJAS.map(([id, nome]) => ({
  id,
  nome,
  label: `Loja ${String(id).padStart(2, "0")} - ${nome}`,
}));

export const LOJAS_LABELS = LOJAS_SISTEMA.map((item) => item.label);

const STORE_ORDER = new Map(LOJAS_LABELS.map((label, index) => [label, index]));

export function getLojaByLabel(value: string | null | undefined): LojaCatalogItem | undefined {
  const target = String(value ?? "").trim();
  if (!target) {
    return undefined;
  }

  return LOJAS_SISTEMA.find((item) => {
    const shortLabel = `Loja ${String(item.id).padStart(2, "0")}`;
    return item.label === target || item.nome === target || shortLabel === target;
  });
}

export function sortLojas(values: string[]): string[] {
  return [...values].sort((left, right) => {
    const leftIndex = STORE_ORDER.get(left);
    const rightIndex = STORE_ORDER.get(right);

    if (leftIndex !== undefined && rightIndex !== undefined) {
      return leftIndex - rightIndex;
    }
    if (leftIndex !== undefined) {
      return -1;
    }
    if (rightIndex !== undefined) {
      return 1;
    }

    return left.localeCompare(right, "pt-BR");
  });
}

export function buildLojaOptions(extraValues: Array<string | null | undefined> = []): string[] {
  const unique = new Set(LOJAS_LABELS);

  for (const value of extraValues) {
    const normalized = String(value ?? "").trim();
    if (normalized) {
      unique.add(normalized);
    }
  }

  return sortLojas(Array.from(unique));
}
