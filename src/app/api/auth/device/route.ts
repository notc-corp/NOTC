import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deviceTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { randomBytes, createHash } from "crypto";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const platform = body.platform ?? null;

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  // Remove any existing tokens for this user (one per user)
  await db.delete(deviceTokens).where(eq(deviceTokens.userId, session.userId));

  await db.insert(deviceTokens).values({
    userId: session.userId,
    companyId: session.companyId ?? null,
    tokenHash,
    platform,
    expiresAt,
  });

  return NextResponse.json({ token });
}

export async function DELETE() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.delete(deviceTokens).where(eq(deviceTokens.userId, session.userId));

  return NextResponse.json({ ok: true });
}
