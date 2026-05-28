import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import bcryptjs from "bcryptjs";
import { eq, isNull } from "drizzle-orm";

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  // Ensure default company exists
  const existingCompanies = await db.select().from(schema.companies);
  let company = existingCompanies[0];
  if (!company) {
    [company] = await db.insert(schema.companies).values({
      name: "NOTC Fleet",
      slug: "notc",
      primaryColor: "#d97706",
    }).returning();
    console.log(`Created default company: ${company.name} (id: ${company.id})`);
  } else {
    console.log(`Using existing company: ${company.name} (id: ${company.id})`);
  }

  // Migrate existing users without companyId
  const unassigned = await db.select().from(schema.users).where(isNull(schema.users.companyId));
  for (const user of unassigned) {
    await db.update(schema.users).set({ companyId: company.id }).where(eq(schema.users.id, user.id));
    console.log(`Assigned company to user: ${user.name}`);
  }

  const existing = await db.select().from(schema.users);
  const hasOwner = existing.some((u) => u.role === "owner");

  if (!hasOwner) {
    const ownerPinHash = await bcryptjs.hash("1234", 10);
    await db.insert(schema.users).values({
      name: "Owner",
      role: "owner",
      pinHash: ownerPinHash,
      companyId: company.id,
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
      companyId: company.id,
    });
    console.log("Created test driver (PIN: 5678, Truck 01)");
  }

  console.log("\nSeed complete!");
}

seed().catch(console.error);
