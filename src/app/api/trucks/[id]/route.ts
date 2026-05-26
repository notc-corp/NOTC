import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const updates: Partial<typeof schema.trucks.$inferInsert> = {};

  if (body.number !== undefined) updates.number = body.number.trim();
  if (body.make !== undefined) updates.make = body.make?.trim() || null;
  if (body.model !== undefined) updates.model = body.model?.trim() || null;
  if (body.year !== undefined) updates.year = body.year ? parseInt(body.year) : null;
  if (body.vin !== undefined) updates.vin = body.vin?.trim() || null;
  if (body.licensePlate !== undefined) updates.licensePlate = body.licensePlate?.trim() || null;
  if (body.isActive !== undefined) updates.isActive = body.isActive;

  const result = db
    .update(schema.trucks)
    .set(updates)
    .where(eq(schema.trucks.id, parseInt(id)))
    .returning()
    .get();

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  db.update(schema.trucks)
    .set({ isActive: false })
    .where(eq(schema.trucks.id, parseInt(id)))
    .run();

  return NextResponse.json({ ok: true });
}
