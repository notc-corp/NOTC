import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { defects } from "@/db/schema";
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
  const body = await req.json().catch(() => ({}));

  const [result] = await db.update(defects)
    .set({
      resolvedAt: new Date().toISOString(),
      resolvedBy: session.userId,
      resolutionNotes: body.notes || null,
    })
    .where(eq(defects.id, parseInt(id)))
    .returning();

  return NextResponse.json({ defect: result });
}
