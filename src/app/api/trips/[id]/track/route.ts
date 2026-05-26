import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { tripLocations, trips } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const tripId = parseInt(id);

  const trip = db.select().from(trips).where(eq(trips.id, tripId)).get();
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Drivers can only see their own trips
  if (session.role === "driver" && trip.driverId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const points = db.select().from(tripLocations)
    .where(eq(tripLocations.tripId, tripId))
    .orderBy(asc(tripLocations.recordedAt))
    .all();

  return NextResponse.json({ trip, points });
}
