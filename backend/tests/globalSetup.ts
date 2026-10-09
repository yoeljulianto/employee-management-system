import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { Client } from "pg";

const MAX_ATTEMPTS = 5;

export default async function warmUpDatabase() {
  const envPath = path.join(process.cwd(), ".env.test");
  const url = dotenv.parse(fs.readFileSync(envPath)).DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL tidak ada di .env.test");
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const client = new Client({ connectionString: url, connectionTimeoutMillis: 60000 });
    const start = Date.now();

    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      console.log(`Database tes siap (percobaan ${attempt}, ${Date.now() - start} ms)`);
      return;
    } catch (err) {
      await client.end().catch(() => {});
      console.log(`Database tes belum siap (percobaan ${attempt}/${MAX_ATTEMPTS}): ${(err as Error).message}`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  throw new Error("Database tes tidak bisa dihubungi. Periksa .env.test dan status branch di Neon.");
}