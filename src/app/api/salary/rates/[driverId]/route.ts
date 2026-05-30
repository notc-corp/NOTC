import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { salaryRates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ driverId: string }> }
) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { driverId } = await params;
  const id = parseInt(driverId);

  if (session.role === "driver" && session.userId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [rate] = await db
    .select()
    .from(salaryRates)
    .where(eq(salaryRates.driverId, id))
    .orderBy(desc(salaryRates.createdAt))
    .limit(1);

  return NextResponse.json({ rate: rate ?? null });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ driverId: string }> }
) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { driverId } = await params;
  const { type, rateCents } = await req.json();

  if (!type || !rateCents || rateCents <= 0) {
    return NextResponse.json({ error: "Invalid rate" }, { status: 400 });
  }

  const [rate] = await db
    .insert(salaryRates)
    .values({ driverId: parseInt(driverId), type, rateCents })
    .returning();

  return NextResponse.json({ rate });
}
