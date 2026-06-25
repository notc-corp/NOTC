import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ledgerDeductions, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

function resolveDriverId(session: { userId?: number; role?: string }, req: NextRequest) {
  if (session.role === "driver") return session.userId ?? null;
  const { searchParams } = new URL(req.url);
  const param = searchParams.get("driverId");
  return param ? parseInt(param) : null;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const driverId = resolveDriverId(session, req);
  if (!driverId) return NextResponse.json({ error: "driverId required" }, { status: 400 });

  const conditions = [eq(ledgerDeductions.driverId, driverId)];
  if (session.companyId) conditions.push(eq(ledgerDeductions.companyId, session.companyId));

  const rows = await db.select().from(ledgerDeductions).where(and(...conditions));
  return NextResponse.json({ deductions: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const { driverId, label, amountCents, startWeek } = body;
  if (!driverId || !label || amountCents == null || !startWeek) {
    return NextResponse.json({ error: "driverId, label, amountCents, startWeek required" }, { status: 400 });
  }

  const [driver] = await db.select({ companyId: users.companyId }).from(users).where(eq(users.id, driverId));

  const [deduction] = await db
    .insert(ledgerDeductions)
    .values({
      companyId: driver?.companyId ?? null,
      driverId,
      label,
      amountCents,
      startWeek,
    })
    .returning();

  return NextResponse.json({ deduction });
}
