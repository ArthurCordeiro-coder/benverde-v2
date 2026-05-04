import { neon } from '@neondatabase/serverless';
import { getLojasData } from './lib/server/dashboard';

async function run() {
  const data = await getLojasData('2026-04');
  console.log(data);
}

run().catch(console.error);
