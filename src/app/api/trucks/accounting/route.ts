import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { trips, expenses, users } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const to = searchParams.get("to") || new Date().toISOString().split("T")[0];

  const conditions = [gte(trips.startedAt, from), lte(trips.startedAt, to + "T23:59:59")];
  if (session.companyId) conditions.push(eq(trips.companyId, session.companyId));

  const tripRows = await db
    .select({
      tripId: trips.id,
      startOdometer: trips.startOdometer,
      endOdometer: trips.endOdometer,
      status: trips.status,
      truckNumber: users.truckNumber,
      driverName: users.name,
      startedAt: trips.startedAt,
    })
    .from(trips)
    .innerJoin(users, eq(trips.driverId, users.id))
    .where(and(...conditions));

  const tripIds = tripRows.map((t) => t.tripId);
  const allExpenses =
    tripIds.length > 0
      ? await db
          .select({
            tripId: expenses.tripId,
            category: expenses.category,
            amountCents: expenses.amountCents,
          })
          .from(expenses)
          .where(
            session.companyId
              ? and(eq(expenses.companyId, session.companyId), gte(expenses.createdAt, from))
              : gte(expenses.createdAt, from)
          )
      : [];

  const expenseMap = new Map<number, Record<string, number>>();
  for (const exp of allExpenses) {
    if (!exp.tripId) continue;
    if (!expenseMap.has(exp.tripId)) expenseMap.set(exp.tripId, {});
    const map = expenseMap.get(exp.tripId)!;
    map[exp.category] = (map[exp.category] || 0) + exp.amountCents;
  }

  // Aggregate by truckNumber
  const byTruck = new Map<
    string,
    {
      truckNumber: string;
      trips: number;
      miles: number;
      fuel: number;
      tolls: number;
      maintenance: number;
      food: number;
      other: number;
    }
  >();

  for (const row of tripRows) {
    const key = row.truckNumber || "Unassigned";
    if (!byTruck.has(key)) {
      byTruck.set(key, {
        truckNumber: key,
        trips: 0,
        miles: 0,
        fuel: 0,
        tolls: 0,
        maintenance: 0,
        food: 0,
        other: 0,
      });
    }
    const entry = byTruck.get(key)!;
    entry.trips++;

    if (row.startOdometer && row.endOdometer) {
      entry.miles += row.endOdometer - row.startOdometer;
    }

    const expCats = expenseMap.get(row.tripId) || {};
    entry.fuel += expCats.fuel || 0;
    entry.tolls += expCats.tolls || 0;
    entry.maintenance += expCats.maintenance || 0;
    entry.food += expCats.food || 0;
    entry.other += expCats.other || 0;
  }

  const rows = Array.from(byTruck.values()).map((r) => ({
    ...r,
    miles: Math.round(r.miles),
    totalCents: r.fuel + r.tolls + r.maintenance + r.food + r.other,
    costPerMile: r.miles > 0 ? (r.fuel + r.tolls + r.maintenance + r.food + r.other) / r.miles : 0,
  }));

  rows.sort((a, b) => b.totalCents - a.totalCents);

  return NextResponse.json({ rows, from, to });
}
