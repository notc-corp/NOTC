import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
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

  // Ensure user belongs to same company
  if (session.companyId) {
    const [target] = await db.select({ companyId: users.companyId }).from(users).where(eq(users.id, userId));
    if (!target || target.companyId !== session.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.username !== undefined) updates.username = body.username.trim().toLowerCase();
  if (body.truckNumber !== undefined) updates.truckNumber = body.truckNumber;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.password) updates.pinHash = await hashPassword(body.password);
  if (body.unlock === true) {
    updates.lockedUntil = null;
    updates.failedAttempts = 0;
  }
  if (body.autoLogoutMidnight !== undefined) updates.autoLogoutMidnight = body.autoLogoutMidnight;
  if (body.ledgerEnabled !== undefined) updates.ledgerEnabled = body.ledgerEnabled;
  if (body.ledgerFeePercent !== undefined) updates.ledgerFeePercent = body.ledgerFeePercent;

  const [result] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning();

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

  // Ensure user belongs to same company
  if (session.companyId) {
    const [target] = await db.select({ companyId: users.companyId }).from(users).where(eq(users.id, userId));
    if (!target || target.companyId !== session.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  await db.update(users)
    .set({ isActive: false })
    .where(eq(users.id, userId));

  return NextResponse.json({ ok: true });
}
