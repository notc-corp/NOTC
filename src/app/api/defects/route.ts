import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { defects, trips, users } from "@/db/schema";
import { saveUpload } from "@/lib/upload";
import { eq, and, desc, isNull } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const onlyOpen = url.searchParams.get("open") === "true";

  const conditions = [];
  if (session.companyId) conditions.push(eq(defects.companyId, session.companyId));
  if (session.role === "driver") conditions.push(eq(defects.driverId, session.userId));
  if (onlyOpen) conditions.push(isNull(defects.resolvedAt));

  const results = await db
    .select({
      id: defects.id,
      driverId: defects.driverId,
      driverName: users.name,
      tripId: defects.tripId,
      description: defects.description,
      severity: defects.severity,
      photoPath: defects.photoPath,
      resolvedAt: defects.resolvedAt,
      resolvedBy: defects.resolvedBy,
      createdAt: defects.createdAt,
    })
    .from(defects)
    .innerJoin(users, eq(defects.driverId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(defects.createdAt));

  return NextResponse.json({ defects: results });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const formData = await req.formData();
  const description = formData.get("description") as string;
  const severity = formData.get("severity") as string;
  const photo = formData.get("photo") as File | null;

  if (!description || !severity) {
    return NextResponse.json({ error: "Description and severity required" }, { status: 400 });
  }

  const activeTrip = (await db.select().from(trips)
    .where(and(eq(trips.driverId, session.userId), eq(trips.status, "active"))))[0];

  let photoPath: string | null = null;
  if (photo) photoPath = await saveUpload(photo, "defects");

  const [result] = await db.insert(defects).values({
    driverId: session.userId,
    tripId: activeTrip?.id || null,
    companyId: session.companyId ?? null,
    description,
    severity: severity as "minor" | "major" | "out_of_service",
    photoPath,
  }).returning();

  return NextResponse.json({ defect: result });
}
