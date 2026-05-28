import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPin } from "@/lib/auth";
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
      role: users.role,
      truckNumber: users.truckNumber,
      phone: users.phone,
      isActive: users.isActive,
      createdAt: users.createdAt,
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

  const { name, pin, truckNumber, phone } = await req.json();

  if (!name || !pin) {
    return NextResponse.json(
      { error: "Name and PIN are required" },
      { status: 400 }
    );
  }

  if (pin.length < 4 || pin.length > 6) {
    return NextResponse.json(
      { error: "PIN must be 4-6 digits" },
      { status: 400 }
    );
  }

  const pinHash = await hashPin(pin);

  const [result] = await db
    .insert(users)
    .values({
      name,
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
