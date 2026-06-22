import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ledgerWeeklyPayments, users } from "@/db/schema";
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

  const conditions = [eq(ledgerWeeklyPayments.driverId, driverId)];
  if (session.companyId) conditions.push(eq(ledgerWeeklyPayments.companyId, session.companyId));

  const rows = await db.select().from(ledgerWeeklyPayments).where(and(...conditions));
  return NextResponse.json({ weeks: rows.map((r) => r.weekStart) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const driverId = session.role === "driver" ? session.userId : body.driverId;
  if (!driverId || !body.weekStart) {
    return NextResponse.json({ error: "driverId and weekStart required" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(ledgerWeeklyPayments)
    .where(and(eq(ledgerWeeklyPayments.driverId, driverId), eq(ledgerWeeklyPayments.weekStart, body.weekStart)));
  if (existing.length > 0) return NextResponse.json({ ok: true });

  const [driver] = await db.select({ companyId: users.companyId }).from(users).where(eq(users.id, driverId));

  await db.insert(ledgerWeeklyPayments).values({
    companyId: driver?.companyId ?? null,
    driverId,
    weekStart: body.weekStart,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("weekStart");
  const driverId = resolveDriverId(session, req);
  if (!driverId || !weekStart) return NextResponse.json({ error: "driverId and weekStart required" }, { status: 400 });

  await db
    .delete(ledgerWeeklyPayments)
    .where(and(eq(ledgerWeeklyPayments.driverId, driverId), eq(ledgerWeeklyPayments.weekStart, weekStart)));

  return NextResponse.json({ ok: true });
}
