import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { downtimeEvents, trips } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET — check active downtime
export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const active = db.select().from(downtimeEvents)
    .where(and(eq(downtimeEvents.driverId, session.userId), isNull(downtimeEvents.endedAt)))
    .get();

  return NextResponse.json({ downtime: active || null });
}

// POST — start downtime
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { defectId, reason } = body;

  // End any existing active downtime first
  const existing = db.select().from(downtimeEvents)
    .where(and(eq(downtimeEvents.driverId, session.userId), isNull(downtimeEvents.endedAt)))
    .get();
  if (existing) {
    db.update(downtimeEvents).set({ endedAt: new Date().toISOString() })
      .where(eq(downtimeEvents.id, existing.id)).run();
  }

  const activeTrip = db.select().from(trips)
    .where(and(eq(trips.driverId, session.userId), eq(trips.status, "active")))
    .get();

  const result = db.insert(downtimeEvents).values({
    driverId: session.userId,
    tripId: activeTrip?.id || null,
    defectId: defectId || null,
    reason: reason || null,
  }).returning().get();

  return NextResponse.json({ downtime: result });
}

// PATCH — end downtime
export async function PATCH() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const active = db.select().from(downtimeEvents)
    .where(and(eq(downtimeEvents.driverId, session.userId), isNull(downtimeEvents.endedAt)))
    .get();

  if (!active) return NextResponse.json({ error: "No active downtime" }, { status: 400 });

  const result = db.update(downtimeEvents)
    .set({ endedAt: new Date().toISOString() })
    .where(eq(downtimeEvents.id, active.id))
    .returning().get();

  return NextResponse.json({ downtime: result });
}
