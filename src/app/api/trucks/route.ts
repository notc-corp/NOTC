import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trucks = await db
    .select()
    .from(schema.trucks)
    .where(session.companyId ? eq(schema.trucks.companyId, session.companyId) : undefined)
    .orderBy(schema.trucks.number);

  return NextResponse.json(trucks);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { number, make, model, year, vin, licensePlate } = await req.json();
  if (!number?.trim()) {
    return NextResponse.json({ error: "Truck number is required" }, { status: 400 });
  }

  const [result] = await db
    .insert(schema.trucks)
    .values({
      number: number.trim(),
      make: make?.trim() || null,
      model: model?.trim() || null,
      year: year ? parseInt(year) : null,
      vin: vin?.trim() || null,
      licensePlate: licensePlate?.trim() || null,
      companyId: session.companyId ?? null,
    })
    .returning();

  return NextResponse.json(result, { status: 201 });
}
