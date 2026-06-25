import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ledgerDeductions } from "@/db/schema";
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
  const deductionId = parseInt(id);
  const body = await req.json();

  const [existing] = await db.select().from(ledgerDeductions).where(eq(ledgerDeductions.id, deductionId));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.label !== undefined) updates.label = body.label;
  if (body.amountCents !== undefined) updates.amountCents = body.amountCents;
  if (body.startWeek !== undefined) updates.startWeek = body.startWeek;
  if (body.stoppedWeek !== undefined) updates.stoppedWeek = body.stoppedWeek;

  const [deduction] = await db
    .update(ledgerDeductions)
    .set(updates)
    .where(eq(ledgerDeductions.id, deductionId))
    .returning();

  return NextResponse.json({ deduction });
}
