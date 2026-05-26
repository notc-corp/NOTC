import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tripId = searchParams.get("tripId");
  const type = searchParams.get("type");

  const allInspections = db
    .select()
    .from(schema.inspections)
    .orderBy(desc(schema.inspections.completedAt))
    .all();

  const filtered = allInspections.filter((i) => {
    if (session.role === "driver" && i.driverId !== session.userId) return false;
    if (tripId && i.tripId !== parseInt(tripId)) return false;
    if (type && i.type !== type) return false;
    return true;
  });

  return NextResponse.json({ inspections: filtered });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, tripId, items } = body as {
    type: "pre" | "post";
    tripId?: number;
    items: { category: string; item: string; status: "ok" | "defect" | "na"; notes?: string }[];
  };

  const hasDefects = items.some((i) => i.status === "defect");
  const hasOutOfService = items.some((i) => i.status === "defect" && i.category === "OUT-OF-SERVICE");
  const safeToOperate = !hasOutOfService;

  const inspection = db
    .insert(schema.inspections)
    .values({
      driverId: session.userId,
      tripId: tripId ?? null,
      type,
      safeToOperate,
      hasDefects,
      hasOutOfService,
      completedAt: new Date().toISOString(),
    })
    .returning()
    .get();

  if (items.length > 0) {
    db.insert(schema.inspectionItems).values(
      items.map((i) => ({
        inspectionId: inspection.id,
        category: i.category,
        item: i.item,
        status: i.status,
        notes: i.notes ?? null,
      }))
    ).run();
  }

  return NextResponse.json({ inspection, safeToOperate });
}
