import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import bcryptjs from "bcryptjs";
import path from "path";

async function seed() {
  const dbPath = path.join(process.cwd(), "notc.db");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });

  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner', 'driver')),
      pin_hash TEXT NOT NULL,
      truck_number TEXT,
      phone TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
      start_odometer REAL,
      end_odometer REAL,
      start_photo_path TEXT,
      end_photo_path TEXT,
      start_ocr_raw TEXT,
      end_ocr_raw TEXT,
      start_ocr_confidence REAL,
      end_ocr_confidence REAL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER REFERENCES trips(id),
      driver_id INTEGER NOT NULL REFERENCES users(id),
      uploaded_by INTEGER NOT NULL REFERENCES users(id),
      category TEXT NOT NULL CHECK(category IN ('fuel', 'tolls', 'maintenance', 'food', 'other')),
      amount_cents INTEGER NOT NULL,
      description TEXT,
      receipt_path TEXT,
      gallons REAL,
      price_per_gallon_cents INTEGER,
      fuel_total_cents INTEGER,
      station_name TEXT,
      ocr_raw TEXT,
      ocr_confidence REAL,
      is_manually_edited INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_date TEXT NOT NULL,
      generated_at TEXT NOT NULL DEFAULT (datetime('now')),
      report_json TEXT NOT NULL,
      anomaly_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL REFERENCES audit_reports(id),
      trip_id INTEGER REFERENCES trips(id),
      expense_id INTEGER REFERENCES expenses(id),
      driver_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'critical')),
      message TEXT NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      resolved_by INTEGER REFERENCES users(id),
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id INTEGER NOT NULL REFERENCES users(id),
      trip_id INTEGER REFERENCES trips(id),
      type TEXT NOT NULL CHECK(type IN ('pre', 'post')),
      safe_to_operate INTEGER,
      has_defects INTEGER NOT NULL DEFAULT 0,
      has_out_of_service INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inspection_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inspection_id INTEGER NOT NULL REFERENCES inspections(id),
      category TEXT NOT NULL,
      item TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ok' CHECK(status IN ('ok', 'defect', 'na')),
      notes TEXT
    );
  `);

  // Check if owner already exists
  const existing = db
    .select()
    .from(schema.users)
    .all();

  const hasOwner = existing.some((u) => u.role === "owner");

  if (!hasOwner) {
    // Create default owner with PIN "1234"
    const ownerPinHash = await bcryptjs.hash("1234", 10);
    db.insert(schema.users)
      .values({
        name: "Owner",
        role: "owner",
        pinHash: ownerPinHash,
      })
      .run();
    console.log("Created owner account (PIN: 1234)");
    console.log("⚠️  CHANGE THIS PIN after first login!");
  } else {
    console.log("Owner account already exists, skipping.");
  }

  // Create a sample driver if none exist
  const hasDriver = existing.some((u) => u.role === "driver");
  if (!hasDriver) {
    const driverPinHash = await bcryptjs.hash("5678", 10);
    db.insert(schema.users)
      .values({
        name: "Test Driver",
        role: "driver",
        pinHash: driverPinHash,
        truckNumber: "Truck 01",
      })
      .run();
    console.log("Created test driver (PIN: 5678, Truck 01)");
  }

  sqlite.close();
  console.log("\nSeed complete! You can now run: npm run dev");
}

seed().catch(console.error);
