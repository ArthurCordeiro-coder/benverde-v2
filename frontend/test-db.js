require("dotenv").config({ path: ".env.local" });
const { neon } = require("@neondatabase/serverless");

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  
  // Let's get the 10 most recent rows based on ID or created_at
  try {
     const rows = await sql`SELECT * FROM precos ORDER BY id DESC LIMIT 5`;
     console.log("Found columns:", Object.keys(rows[0]));
     console.log("Recent data:", rows.map(r => ({
        id: r.id, 
        data_pesquisa: r.data_pesquisa, 
        data: r.data, 
        created_at: r.created_at
     })));
  } catch (err) {
     console.error("Query failed", err);
  }
}
run();
