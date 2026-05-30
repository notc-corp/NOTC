import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { salaryEntries, salaryRates, users } from "@/db/schema";
import { eq, desc, isNull, and } from "drizzle-orm";

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
  if (driverId) conditions.push(eq(salaryEntries.driverId, driverId));
  if (session.companyId) conditions.push(eq(salaryEntries.companyId, session.companyId));

  const entries = await db
    .select()
    .from(salaryEntries)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(salaryEntries.entryDate), desc(salaryEntries.createdAt));

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const driverId = session.role === "driver" ? session.userId : body.driverId;

  if (!driverId) return NextResponse.json({ error: "driverId required" }, { status: 400 });

  // Get current rate
  const [rate] = await db
    .select()
    .from(salaryRates)
    .where(eq(salaryRates.driverId, driverId))
    .orderBy(desc(salaryRates.createdAt))
    .limit(1);

  if (!rate) return NextResponse.json({ error: "No salary rate set for this driver" }, { status: 400 });

  const { type, customer, loadType, tons, hours, notes, entryDate } = body;

  if (!type || !entryDate) {
    return NextResponse.json({ error: "type and entryDate required" }, { status: 400 });
  }

  let totalCents: number;
  if (type === "per_ton") {
    if (!tons || tons <= 0) return NextResponse.json({ error: "tons required" }, { status: 400 });
    totalCents = Math.round(rate.rateCents * tons);
  } else {
    if (!hours || hours <= 0) return NextResponse.json({ error: "hours required" }, { status: 400 });
    totalCents = Math.round(rate.rateCents * hours);
  }

  // Get companyId from driver record
  const [driver] = await db.select({ companyId: users.companyId }).from(users).where(eq(users.id, driverId));

  const [entry] = await db
    .insert(salaryEntries)
    .values({
      companyId: driver?.companyId ?? null,
      driverId,
      type,
      customer: customer || null,
      loadType: loadType || null,
      tons: tons ?? null,
      hours: hours ?? null,
      rateCents: rate.rateCents,
      totalCents,
      notes: notes || null,
      entryDate,
    })
    .returning();

  return NextResponse.json({ entry });
}
