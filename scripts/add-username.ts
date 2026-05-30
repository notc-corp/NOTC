import { neon } from "@neondatabase/serverless";

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const sql = neon(databaseUrl);

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users(username) WHERE username IS NOT NULL`;

  console.log("Migration complete: username column added to users table");
}

migrate().catch(console.error);
