import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deviceTokens, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { createHash } from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { token } = body;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const [record] = await db
    .select()
    .from(deviceTokens)
    .where(eq(deviceTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (new Date(record.expiresAt) < new Date()) {
    await db.delete(deviceTokens).where(eq(deviceTokens.tokenHash, tokenHash));
    return NextResponse.json({ error: "Token expired" }, { status: 401 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, record.userId))
    .limit(1);

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  // Update last used
  await db
    .update(deviceTokens)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(deviceTokens.tokenHash, tokenHash));

  const session = await getSession();
  session.userId = user.id;
  session.role = user.role as "owner" | "driver";
  session.name = user.name;
  session.companyId = user.companyId ?? undefined;
  await session.save();

  return NextResponse.json({ role: user.role, name: user.name });
}
