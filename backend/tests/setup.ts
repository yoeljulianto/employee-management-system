import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const root = process.cwd();
const testEnvPath = path.join(root, ".env.test");
const mainEnvPath = path.join(root, ".env");

if (!fs.existsSync(testEnvPath)) {
  throw new Error("File .env.test tidak ditemukan. Buat dulu dengan DATABASE_URL milik branch test.");
}

const testUrl = dotenv.parse(fs.readFileSync(testEnvPath)).DATABASE_URL;
const mainUrl = fs.existsSync(mainEnvPath)
  ? dotenv.parse(fs.readFileSync(mainEnvPath)).DATABASE_URL
  : undefined;

if (!testUrl) {
  throw new Error("DATABASE_URL tidak ada di .env.test");
}

if (testUrl === mainUrl) {
  throw new Error("DATABASE_URL di .env.test sama dengan .env. Tes tidak boleh memakai database utama.");
}

process.env.DATABASE_URL = testUrl;
process.env.JWT_SECRET = "0f672c16b8d2c17b27bb44487f039965104b6d32303982c77c0127ee66557b14";