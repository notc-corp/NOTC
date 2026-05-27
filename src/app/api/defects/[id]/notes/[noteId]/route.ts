import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { defectNotes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { noteId } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.text?.trim()) {
    return NextResponse.json({ error: "Text required" }, { status: 400 });
  }

  const [note] = await db.update(defectNotes)
    .set({ text: body.text.trim(), updatedAt: new Date().toISOString() })
    .where(eq(defectNotes.id, parseInt(noteId)))
    .returning();

  return NextResponse.json({ note });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { noteId } = await params;
  await db.delete(defectNotes).where(eq(defectNotes.id, parseInt(noteId)));

  return NextResponse.json({ ok: true });
}
