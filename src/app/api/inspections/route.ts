import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tripId = searchParams.get("tripId");
  const type = searchParams.get("type");

  const allInspections = await db
    .select({
      id: schema.inspections.id,
      driverId: schema.inspections.driverId,
      driverName: schema.users.name,
      tripId: schema.inspections.tripId,
      type: schema.inspections.type,
      safeToOperate: schema.inspections.safeToOperate,
      hasDefects: schema.inspections.hasDefects,
      hasOutOfService: schema.inspections.hasOutOfService,
      completedAt: schema.inspections.completedAt,
      companyId: schema.users.companyId,
    })
    .from(schema.inspections)
    .innerJoin(schema.users, eq(schema.inspections.driverId, schema.users.id))
    .orderBy(desc(schema.inspections.completedAt));

  const filtered = allInspections.filter((i) => {
    if (session.companyId && i.companyId !== session.companyId) return false;
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
  const { type, tripId, items, signatureDataUrl } = body as {
    type: "pre" | "post";
    tripId?: number;
    items: { category: string; item: string; status: "ok" | "defect" | "na"; notes?: string }[];
    signatureDataUrl?: string | null;
  };

  const hasDefects = items.some((i) => i.status === "defect");
  const hasOutOfService = items.some((i) => i.status === "defect" && i.category === "OUT-OF-SERVICE");
  const safeToOperate = !hasOutOfService;

  let signaturePath: string | null = null;
  if (signatureDataUrl) {
    try {
      const base64 = signatureDataUrl.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64, "base64");
      const blob = await put(`signatures/${randomUUID()}.png`, buffer, {
        access: "public",
        contentType: "image/png",
      });
      signaturePath = blob.url;
    } catch { /* non-fatal — proceed without signature */ }
  }

  const [inspection] = await db
    .insert(schema.inspections)
    .values({
      driverId: session.userId,
      tripId: tripId ?? null,
      type,
      safeToOperate,
      hasDefects,
      hasOutOfService,
      signaturePath,
      completedAt: new Date().toISOString(),
    })
    .returning();

  if (items.length > 0) {
    await db.insert(schema.inspectionItems).values(
      items.map((i) => ({
        inspectionId: inspection.id,
        category: i.category,
        item: i.item,
        status: i.status,
        notes: i.notes ?? null,
      }))
    );
  }

  return NextResponse.json({ inspection, safeToOperate });
}
