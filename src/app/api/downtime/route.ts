import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { downtimeEvents, trips } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET — check active downtime
export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const active = (await db.select().from(downtimeEvents)
    .where(and(eq(downtimeEvents.driverId, session.userId), isNull(downtimeEvents.endedAt))))[0];

  return NextResponse.json({ downtime: active || null });
}

// POST — start downtime
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { defectId, reason } = body;

  const existing = (await db.select().from(downtimeEvents)
    .where(and(eq(downtimeEvents.driverId, session.userId), isNull(downtimeEvents.endedAt))))[0];
  if (existing) {
    await db.update(downtimeEvents).set({ endedAt: new Date().toISOString() })
      .where(eq(downtimeEvents.id, existing.id));
  }

  const activeTrip = (await db.select().from(trips)
    .where(and(eq(trips.driverId, session.userId), eq(trips.status, "active"))))[0];

  const [result] = await db.insert(downtimeEvents).values({
    driverId: session.userId,
    tripId: activeTrip?.id || null,
    defectId: defectId || null,
    reason: reason || null,
  }).returning();

  return NextResponse.json({ downtime: result });
}

// PATCH — end downtime
export async function PATCH() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const active = (await db.select().from(downtimeEvents)
    .where(and(eq(downtimeEvents.driverId, session.userId), isNull(downtimeEvents.endedAt))))[0];

  if (!active) return NextResponse.json({ error: "No active downtime" }, { status: 400 });

  const [result] = await db.update(downtimeEvents)
    .set({ endedAt: new Date().toISOString() })
    .where(eq(downtimeEvents.id, active.id))
    .returning();

  return NextResponse.json({ downtime: result });
}
