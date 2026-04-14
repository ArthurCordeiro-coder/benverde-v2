import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log("Tables:", tables.map(t => t.table_name));

  const rows = await sql`SELECT * FROM precos ORDER BY id DESC LIMIT 10`;
  
  if (rows.length === 0) {
     console.log("No rows in precos.");
     return;
  }
  
  console.log("Columns:", Object.keys(rows[0]));
  console.log("Samples:", rows.map(r => ({
     id: r.id,
     data_pesquisa: r.data_pesquisa,
     data: r.data,
     created_at: r.created_at,
     imported_at: r.imported_at
  })));
}
run();
