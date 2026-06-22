import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ledgerEntries, users } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

function withComputed(rows: (typeof ledgerEntries.$inferSelect)[], feePercent: number) {
  let prevOdometer: number | null = null;
  const out = rows.map((row) => {
    let milesForDay: number | null = null;
    if (row.odometer != null && prevOdometer != null && row.odometer >= prevOdometer) {
      milesForDay = row.odometer - prevOdometer;
    }
    if (row.odometer != null) prevOdometer = row.odometer;

    const mpg = milesForDay != null && row.gallons ? milesForDay / row.gallons : null;

    // Net = amount still owed via check: GROSS after dispatch fee, minus fuel, minus cash already received.
    // Repair/maintenance cash expenses are tracked separately and never affect this payout figure.
    let netCents: number | null = null;
    if (row.grossCents != null || row.fuelCostCents != null || row.cashReceivedCents != null) {
      const grossAfterFee = row.grossCents != null ? Math.round(row.grossCents * (1 - feePercent / 100)) : 0;
      netCents = grossAfterFee - (row.fuelCostCents ?? 0) - (row.cashReceivedCents ?? 0);
    }

    const moneyPerHour = netCents != null && row.workingHours ? netCents / row.workingHours : null;

    return { ...row, milesForDay, mpg, netCents, moneyPerHour };
  });
  return out;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const driverIdParam = searchParams.get("driverId");

  const driverId =
    session.role === "driver"
      ? session.userId
      : driverIdParam
      ? parseInt(driverIdParam)
      : null;

  if (!driverId) return NextResponse.json({ error: "driverId required" }, { status: 400 });

  const conditions = [eq(ledgerEntries.driverId, driverId)];
  if (session.companyId) conditions.push(eq(ledgerEntries.companyId, session.companyId));

  const rows = await db
    .select()
    .from(ledgerEntries)
    .where(and(...conditions))
    .orderBy(asc(ledgerEntries.entryDate), asc(ledgerEntries.id));

  const [driver] = await db.select({ ledgerFeePercent: users.ledgerFeePercent }).from(users).where(eq(users.id, driverId));
  const feePercent = driver?.ledgerFeePercent ?? 12;

  const computed = withComputed(rows, feePercent).reverse();

  return NextResponse.json({ entries: computed });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const driverId = session.role === "driver" ? session.userId : body.driverId;
  if (!driverId) return NextResponse.json({ error: "driverId required" }, { status: 400 });

  const {
    entryDate, odometer, gallons, fuelPricePerGallon, grossCents, workingHours,
    cashReceivedCents, cashExpenseCents, cashExpenseNote,
  } = body;
  if (!entryDate) return NextResponse.json({ error: "entryDate required" }, { status: 400 });

  const fuelCostCents =
    fuelPricePerGallon != null && gallons != null ? Math.round(fuelPricePerGallon * gallons * 100) : null;

  const [driver] = await db.select({ companyId: users.companyId }).from(users).where(eq(users.id, driverId));

  const [entry] = await db
    .insert(ledgerEntries)
    .values({
      companyId: driver?.companyId ?? null,
      driverId,
      entryDate,
      odometer: odometer ?? null,
      gallons: gallons ?? null,
      fuelPricePerGallon: fuelPricePerGallon ?? null,
      fuelCostCents,
      grossCents: grossCents ?? null,
      workingHours: workingHours ?? null,
      cashReceivedCents: cashReceivedCents ?? null,
      cashExpenseCents: cashExpenseCents ?? null,
      cashExpenseNote: cashExpenseNote || null,
    })
    .returning();

  return NextResponse.json({ entry });
}
