import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { neon } from "@neondatabase/serverless";

// Replicate the exact logic from precos.ts
function normalizeColumnName(value: unknown): string {
  return String(value ?? "").trim().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ");
}

function formatDateKey(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear());
  return `${day}-${month}-${year}`;
}

async function run() {
  const sql = neon(process.env.DATABASE_URL!);

  const rows = await sql`SELECT * FROM precos WHERE data_pesquisa::date = '2026-04-14' LIMIT 50`;
  
  const columns = Object.keys(rows[0] ?? {});
  console.log("Columns:", columns);
  console.log("Normalised:", columns.map(normalizeColumnName));
  
  
  const dateColumn = columns.find(c => normalizeColumnName(c) === "data_pesquisa");
  const marketColumn = columns.find(c => ["estabelecimento", "mercado", "loja", "concorrente"].includes(normalizeColumnName(c)));
  const priceColumn = columns.find(c => ["preco", "valor", "price"].includes(normalizeColumnName(c)));
  const productColumn = columns.find(c => normalizeColumnName(c).includes("produto buscado")) ??
     columns.find(c => normalizeColumnName(c).includes("produto"));

  console.log("dateColumn:", dateColumn);
  console.log("marketColumn:", marketColumn);
  console.log("priceColumn:", priceColumn);
  console.log("productColumn:", productColumn);
  
  // Check what date key it generates
  const sampleDate = rows[0][dateColumn!] as Date;
  console.log("sampleDate type:", typeof sampleDate, sampleDate);
  console.log("DateKey would be:", formatDateKey(sampleDate));
}
run();
