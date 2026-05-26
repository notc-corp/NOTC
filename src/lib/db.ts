import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";
import path from "path";

const dbPath = path.join(process.cwd(), "notc.db");
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_path TEXT,
    primary_color TEXT DEFAULT '#d97706',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS defect_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    defect_id INTEGER NOT NULL REFERENCES defects(id),
    author_id INTEGER NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS trucks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT NOT NULL UNIQUE,
    make TEXT,
    model TEXT,
    year INTEGER,
    vin TEXT,
    license_plate TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Add company_id column to trucks if missing
const trucksColumns = sqlite.pragma("table_info(trucks)") as { name: string }[];
if (!trucksColumns.some((c) => c.name === "company_id")) {
  sqlite.exec(`ALTER TABLE trucks ADD COLUMN company_id INTEGER REFERENCES companies(id)`);
}

// Add truck_id and company_id to trips if missing
const tripsColumns = sqlite.pragma("table_info(trips)") as { name: string }[];
if (!tripsColumns.some((c) => c.name === "truck_id")) {
  sqlite.exec(`ALTER TABLE trips ADD COLUMN truck_id INTEGER REFERENCES trucks(id)`);
}
if (!tripsColumns.some((c) => c.name === "company_id")) {
  sqlite.exec(`ALTER TABLE trips ADD COLUMN company_id INTEGER REFERENCES companies(id)`);
}

// Add company_id to users if missing
const usersColumns = sqlite.pragma("table_info(users)") as { name: string }[];
if (!usersColumns.some((c) => c.name === "company_id")) {
  sqlite.exec(`ALTER TABLE users ADD COLUMN company_id INTEGER REFERENCES companies(id)`);
}

// Add company_id to expenses if missing
const expensesColumns = sqlite.pragma("table_info(expenses)") as { name: string }[];
if (!expensesColumns.some((c) => c.name === "company_id")) {
  sqlite.exec(`ALTER TABLE expenses ADD COLUMN company_id INTEGER REFERENCES companies(id)`);
}

// Add company_id to defects if missing
const defectsColumns = sqlite.pragma("table_info(defects)") as { name: string }[];
if (!defectsColumns.some((c) => c.name === "company_id")) {
  sqlite.exec(`ALTER TABLE defects ADD COLUMN company_id INTEGER REFERENCES companies(id)`);
}

export const db = drizzle(sqlite, { schema });
export { schema };
