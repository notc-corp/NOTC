import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { salaryPayments, salaryEntries, users } from "@/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";

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

  const conditions: ReturnType<typeof eq>[] = [];
  if (driverId) conditions.push(eq(salaryPayments.driverId, driverId));
  if (session.companyId) conditions.push(eq(salaryPayments.companyId, session.companyId));

  const payments = await db
    .select()
    .from(salaryPayments)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(salaryPayments.paidAt));

  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { driverId, amountCents, notes } = await req.json();

  if (!driverId || !amountCents || amountCents <= 0) {
    return NextResponse.json({ error: "driverId and amountCents required" }, { status: 400 });
  }

  // Get companyId from driver record
  const [driver] = await db.select({ companyId: users.companyId }).from(users).where(eq(users.id, driverId));

  // Create payment
  const [payment] = await db
    .insert(salaryPayments)
    .values({
      companyId: driver?.companyId ?? null,
      driverId,
      amountCents,
      notes: notes || null,
      createdBy: session.userId,
    })
    .returning();

  // Mark all unpaid entries for this driver as paid
  await db
    .update(salaryEntries)
    .set({ paymentId: payment.id })
    .where(and(eq(salaryEntries.driverId, driverId), isNull(salaryEntries.paymentId)));

  return NextResponse.json({ payment });
}
