// The backend (/api/precos/overview) only gives us the product NAME — no
// category, unit or illustration. We infer those from the name with a small
// keyword dictionary so the store-style cards keep working with real data.
import type { Categoria } from "./types";

export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

type Rule = {
  match: string[]; // any substring present (normalized) → this rule wins
  categoria: Categoria;
  art: string;
  unidade?: string; // defaults to "kg"
};

// Ordered by priority — more specific entries first (e.g. "banana prata"
// before "banana").
const RULES: Rule[] = [
  { match: ["banana prata"], categoria: "Frutas", art: "banana_prata" },
  { match: ["banana nanica", "banana caturra"], categoria: "Frutas", art: "banana_nanica" },
  { match: ["banana"], categoria: "Frutas", art: "banana" },
  { match: ["morango"], categoria: "Frutas", art: "strawberry", unidade: "un" },
  { match: ["maca", "maça"], categoria: "Frutas", art: "apple" },
  { match: ["laranja"], categoria: "Frutas", art: "orange" },
  { match: ["limao"], categoria: "Frutas", art: "lemon" },
  { match: ["uva"], categoria: "Frutas", art: "grape" },
  { match: ["melancia"], categoria: "Frutas", art: "watermelon" },
  { match: ["melao"], categoria: "Frutas", art: "watermelon" },
  { match: ["manga"], categoria: "Frutas", art: "mango" },
  { match: ["abacaxi"], categoria: "Frutas", art: "pineapple", unidade: "un" },
  { match: ["mamao"], categoria: "Frutas", art: "papaya" },
  { match: ["abacate"], categoria: "Frutas", art: "avocado" },
  { match: ["pera", "pêra"], categoria: "Frutas", art: "apple" },

  { match: ["tomate"], categoria: "Legumes", art: "tomato" },
  { match: ["cenoura"], categoria: "Legumes", art: "carrot" },
  { match: ["batata"], categoria: "Legumes", art: "potato" },
  { match: ["cebola"], categoria: "Legumes", art: "onion" },
  { match: ["alho"], categoria: "Legumes", art: "garlic" },
  { match: ["pepino"], categoria: "Legumes", art: "cucumber" },
  { match: ["pimentao", "pimenta"], categoria: "Legumes", art: "pepper" },
  { match: ["abobora", "abobrinha"], categoria: "Legumes", art: "cucumber" },
  { match: ["beterraba"], categoria: "Legumes", art: "onion" },
  { match: ["mandioca", "aipim", "macaxeira"], categoria: "Legumes", art: "potato" },
  { match: ["chuchu"], categoria: "Legumes", art: "cucumber" },

  { match: ["alface"], categoria: "Verduras", art: "lettuce", unidade: "un" },
  { match: ["repolho"], categoria: "Verduras", art: "cabbage", unidade: "un" },
  { match: ["brocolis", "brócolis"], categoria: "Verduras", art: "broccoli", unidade: "un" },
  { match: ["couve"], categoria: "Verduras", art: "cabbage", unidade: "un" },
  { match: ["rucula", "espinafre", "agriao", "cheiro verde", "coentro", "salsa"], categoria: "Verduras", art: "lettuce", unidade: "un" },
];

const UNIT_HINTS = ["bandeja", "maco", "maço", "unidade", "duzia", "pe ", "cabeca", "pacote", "molho"];

export type Classification = {
  categoria: Categoria;
  art: string;
  unidade: string;
};

export function classify(produto: string): Classification {
  const n = normalize(produto);

  for (const rule of RULES) {
    if (rule.match.some((m) => n.includes(normalize(m)))) {
      return {
        categoria: rule.categoria,
        art: rule.art,
        unidade: rule.unidade ?? guessUnit(n, "kg"),
      };
    }
  }

  return { categoria: "Outros", art: "default", unidade: guessUnit(n, "kg") };
}

function guessUnit(normalizedName: string, fallback: string): string {
  if (/\bun\b/.test(normalizedName) || UNIT_HINTS.some((h) => normalizedName.includes(h))) {
    return "un";
  }
  return fallback;
}
