import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import bcryptjs from "bcryptjs";

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  const existing = await db.select().from(schema.users);
  const hasOwner = existing.some((u) => u.role === "owner");

  if (!hasOwner) {
    const ownerPinHash = await bcryptjs.hash("1234", 10);
    await db.insert(schema.users).values({
      name: "Owner",
      role: "owner",
      pinHash: ownerPinHash,
    });
    console.log("Created owner account (PIN: 1234)");
    console.log("CHANGE THIS PIN after first login!");
  } else {
    console.log("Owner account already exists, skipping.");
  }

  const hasDriver = existing.some((u) => u.role === "driver");
  if (!hasDriver) {
    const driverPinHash = await bcryptjs.hash("5678", 10);
    await db.insert(schema.users).values({
      name: "Test Driver",
      role: "driver",
      pinHash: driverPinHash,
      truckNumber: "Truck 01",
    });
    console.log("Created test driver (PIN: 5678, Truck 01)");
  }

  console.log("\nSeed complete!");
}

seed().catch(console.error);
