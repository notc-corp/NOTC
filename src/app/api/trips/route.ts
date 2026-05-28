import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { trips, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const driverId = url.searchParams.get("driverId");

  let query = db
    .select({
      id: trips.id,
      driverId: trips.driverId,
      driverName: users.name,
      truckNumber: users.truckNumber,
      status: trips.status,
      startOdometer: trips.startOdometer,
      endOdometer: trips.endOdometer,
      startedAt: trips.startedAt,
      endedAt: trips.endedAt,
      notes: trips.notes,
    })
    .from(trips)
    .innerJoin(users, eq(trips.driverId, users.id))
    .orderBy(desc(trips.startedAt));

  const conditions = [];

  if (session.companyId) {
    conditions.push(eq(trips.companyId, session.companyId));
  }

  // Drivers can only see their own trips
  if (session.role === "driver") {
    conditions.push(eq(trips.driverId, session.userId));
  } else if (driverId) {
    conditions.push(eq(trips.driverId, parseInt(driverId)));
  }

  if (status) {
    conditions.push(eq(trips.status, status as "active" | "completed" | "cancelled"));
  }

  const results = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  return NextResponse.json({ trips: results });
}
