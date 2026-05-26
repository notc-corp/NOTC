import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { tripLocations, trips } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { lat, lng, speed, heading, accuracy } = await req.json();
  if (lat == null || lng == null) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }

  // Only track during active trip
  const activeTrip = db.select().from(trips)
    .where(and(eq(trips.driverId, session.userId), eq(trips.status, "active")))
    .get();

  if (!activeTrip) {
    return NextResponse.json({ error: "No active trip" }, { status: 404 });
  }

  const point = db.insert(tripLocations).values({
    tripId: activeTrip.id,
    driverId: session.userId,
    lat,
    lng,
    speed: speed ?? null,
    heading: heading ?? null,
    accuracy: accuracy ?? null,
  }).returning().get();

  return NextResponse.json({ point });
}
