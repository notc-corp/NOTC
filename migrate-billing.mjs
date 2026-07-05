// One-time migration: add billing columns to companies table
// Run: node migrate-billing.mjs
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split("=").map((s) => s.trim()))
);

const sql = neon(env.DATABASE_URL);

await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at text`;
await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trial'`;
await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_customer_id text`;
await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_subscription_id text`;
await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_name text NOT NULL DEFAULT 'trial'`;

console.log("✅ Billing columns added to companies");
