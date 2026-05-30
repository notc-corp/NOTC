import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const conditions = [eq(users.role, "driver")];
  if (session.companyId) conditions.push(eq(users.companyId, session.companyId));

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      role: users.role,
      truckNumber: users.truckNumber,
      phone: users.phone,
      isActive: users.isActive,
      createdAt: users.createdAt,
      lockedUntil: users.lockedUntil,
      failedAttempts: users.failedAttempts,
    })
    .from(users)
    .where(and(...conditions));

  return NextResponse.json({ users: allUsers });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { name, username, password, truckNumber, phone } = await req.json();

  if (!name || !username || !password) {
    return NextResponse.json(
      { error: "Name, username and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 4) {
    return NextResponse.json(
      { error: "Password must be at least 4 characters" },
      { status: 400 }
    );
  }

  const pinHash = await hashPassword(password);

  const [result] = await db
    .insert(users)
    .values({
      name,
      username: username.trim().toLowerCase(),
      role: "driver",
      pinHash,
      truckNumber: truckNumber || null,
      phone: phone || null,
      companyId: session.companyId ?? null,
    })
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
