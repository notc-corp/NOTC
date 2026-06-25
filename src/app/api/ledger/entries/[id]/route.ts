import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ledgerEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entryId = parseInt(id);
  const body = await req.json();

  const [existing] = await db.select().from(ledgerEntries).where(eq(ledgerEntries.id, entryId));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role === "driver" && existing.driverId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (body.entryDate !== undefined) updates.entryDate = body.entryDate;
  if (body.odometer !== undefined) updates.odometer = body.odometer;
  if (body.gallons !== undefined) updates.gallons = body.gallons;
  if (body.fuelPricePerGallon !== undefined) updates.fuelPricePerGallon = body.fuelPricePerGallon;
  if (body.grossCents !== undefined) updates.grossCents = body.grossCents;
  if (body.workingHours !== undefined) updates.workingHours = body.workingHours;
  if (body.cashReceivedCents !== undefined) updates.cashReceivedCents = body.cashReceivedCents;
  if (body.cashExpenseCents !== undefined) updates.cashExpenseCents = body.cashExpenseCents;
  if (body.cashExpenseNote !== undefined) updates.cashExpenseNote = body.cashExpenseNote || null;

  const fuelPricePerGallon = updates.fuelPricePerGallon ?? existing.fuelPricePerGallon;
  const gallons = updates.gallons ?? existing.gallons;
  if (fuelPricePerGallon != null && gallons != null) {
    updates.fuelCostCents = Math.round((fuelPricePerGallon as number) * (gallons as number) * 100);
  }

  if (Object.keys(updates).length > 0) {
    updates.editedAt = new Date().toISOString();
  }

  const [entry] = await db
    .update(ledgerEntries)
    .set(updates)
    .where(and(eq(ledgerEntries.id, entryId)))
    .returning();

  return NextResponse.json({ entry });
}
