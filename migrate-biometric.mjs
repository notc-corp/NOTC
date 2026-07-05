// One-time migration: create device_tokens table for biometric login
// Run: node migrate-biometric.mjs
// Delete this file after running.

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf-8");
const url = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim();
if (!url) throw new Error("DATABASE_URL not found in .env.local");

const sql = neon(url);

await sql`
  CREATE TABLE IF NOT EXISTS device_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    platform TEXT,
    created_at TEXT NOT NULL,
    last_used_at TEXT,
    expires_at TEXT NOT NULL
  )
`;

await sql`CREATE INDEX IF NOT EXISTS device_tokens_user_id_idx ON device_tokens(user_id)`;

console.log("✅ device_tokens table created");
