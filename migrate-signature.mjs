// One-time migration: add signature_path to inspections table
// Run: node migrate-signature.mjs
// Delete after running.

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf-8");
const url = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim();
if (!url) throw new Error("DATABASE_URL not found in .env.local");

const sql = neon(url);

await sql`ALTER TABLE inspections ADD COLUMN IF NOT EXISTS signature_path TEXT`;

console.log("✅ signature_path added to inspections");
