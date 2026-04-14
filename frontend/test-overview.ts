import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { getPriceOverview } from "./lib/server/precos";

async function run() {
  try {
    const overview = await getPriceOverview();
    console.log("Overview Dates:", overview.dates.map(d => d.key));
    console.log("Latest Date:", overview.latestDate);
    
    // Check if 14-04-2026 is in snapshots
    console.log("14-04-2026 in snapshots?", !!overview.snapshots["14-04-2026"]);
    if (overview.snapshots["14-04-2026"]) {
       console.log("Sample items for 14-04-2026:", overview.snapshots["14-04-2026"].slice(0, 2));
    }
  } catch (err) {
    console.error(err);
  }
}
run();
