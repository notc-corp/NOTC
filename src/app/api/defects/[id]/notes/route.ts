import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { defectNotes } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await params;
  const notes = await db.select().from(defectNotes)
    .where(eq(defectNotes.defectId, parseInt(id)))
    .orderBy(asc(defectNotes.createdAt));

  return NextResponse.json({ notes });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.text?.trim()) {
    return NextResponse.json({ error: "Text required" }, { status: 400 });
  }

  const [note] = await db.insert(defectNotes).values({
    defectId: parseInt(id),
    authorId: session.userId,
    text: body.text.trim(),
  }).returning();

  return NextResponse.json({ note });
}
