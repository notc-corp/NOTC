import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { downtimeEvents, users } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const conditions = session.companyId ? [eq(users.companyId, session.companyId)] : [];

  const results = await db
    .select({
      id: downtimeEvents.id,
      driverId: downtimeEvents.driverId,
      driverName: users.name,
      tripId: downtimeEvents.tripId,
      defectId: downtimeEvents.defectId,
      reason: downtimeEvents.reason,
      startedAt: downtimeEvents.startedAt,
      endedAt: downtimeEvents.endedAt,
    })
    .from(downtimeEvents)
    .innerJoin(users, eq(downtimeEvents.driverId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(downtimeEvents.startedAt));

  return NextResponse.json({ downtimes: results });
}
