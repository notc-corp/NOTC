import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPin } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id);
  const body = await req.json();

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.truckNumber !== undefined) updates.truckNumber = body.truckNumber;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.pin) updates.pinHash = await hashPin(body.pin);

  const result = db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning()
    .get();

  return NextResponse.json({
    user: {
      id: result.id,
      name: result.name,
      truckNumber: result.truckNumber,
      phone: result.phone,
      isActive: result.isActive,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id);

  // Soft delete — just deactivate
  db.update(users)
    .set({ isActive: false })
    .where(eq(users.id, userId))
    .run();

  return NextResponse.json({ ok: true });
}
