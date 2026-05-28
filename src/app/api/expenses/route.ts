import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenses, trips } from "@/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { saveUpload } from "@/lib/upload";
import { notifyExpenseAdded } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const today = url.searchParams.get("today");
  const tripId = url.searchParams.get("tripId");
  const driverId = url.searchParams.get("driverId");

  const conditions = [];

  if (session.companyId) {
    conditions.push(eq(expenses.companyId, session.companyId));
  }

  if (session.role === "driver") {
    conditions.push(eq(expenses.driverId, session.userId));
  } else if (driverId) {
    conditions.push(eq(expenses.driverId, parseInt(driverId)));
  }

  if (today === "true") {
    const todayStr = new Date().toISOString().split("T")[0];
    conditions.push(gte(expenses.createdAt, todayStr));
  }

  if (tripId) {
    conditions.push(eq(expenses.tripId, parseInt(tripId)));
  }

  const results = await db
    .select()
    .from(expenses)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(expenses.createdAt));

  return NextResponse.json({ expenses: results });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await req.json();
    const targetDriverId = session.userId;

    const activeTripRows = await db.select().from(trips)
      .where(and(eq(trips.driverId, targetDriverId), eq(trips.status, "active")));
    const activeTrip = activeTripRows[0] ?? (await db.select().from(trips)
      .where(and(eq(trips.driverId, targetDriverId), eq(trips.status, "completed")))
      .orderBy(desc(trips.endedAt))
      .limit(1))[0];

    const [result] = await db
      .insert(expenses)
      .values({
        tripId: activeTrip?.id || null,
        driverId: targetDriverId,
        uploadedBy: session.userId,
        companyId: session.companyId ?? null,
        category: body.category as "fuel" | "tolls" | "maintenance" | "food" | "other",
        amountCents: body.amountCents ?? 0,
        description: body.description || null,
        receiptPath: body.receiptPath || null,
        gallons: body.gallons || null,
        pricePerGallonCents: body.pricePerGallonCents || null,
        fuelTotalCents: body.amountCents || null,
        stationName: body.merchant || null,
        isManuallyEdited: body.isManuallyEdited ?? false,
      })
      .returning();

    notifyExpenseAdded({
      companyId: session.companyId,
      driverName: session.name,
      category: body.category,
      amountCents: body.amountCents ?? 0,
      stationName: body.merchant || null,
    });

    return NextResponse.json({ expense: result });
  }

  const formData = await req.formData();
  const photo = formData.get("photo") as File | null;
  const category = formData.get("category") as string;
  const ocrDataStr = formData.get("ocrData") as string | null;
  const driverIdStr = formData.get("driverId") as string | null;

  const targetDriverId =
    session.role === "owner" && driverIdStr
      ? parseInt(driverIdStr)
      : session.userId;

  const activeTrip = (await db
    .select()
    .from(trips)
    .where(and(eq(trips.driverId, targetDriverId), eq(trips.status, "active"))))[0];

  let receiptPath: string | null = null;
  if (photo) {
    receiptPath = await saveUpload(photo, "receipts");
  }

  let ocrData = null;
  if (ocrDataStr) {
    try {
      ocrData = JSON.parse(ocrDataStr);
    } catch {
      // ignore
    }
  }

  const amountCents = ocrData?.total ? Math.round(ocrData.total * 100) : 0;

  const [result] = await db
    .insert(expenses)
    .values({
      tripId: activeTrip?.id || null,
      driverId: targetDriverId,
      uploadedBy: session.userId,
      companyId: session.companyId ?? null,
      category: category as "fuel" | "tolls" | "maintenance" | "food" | "other",
      amountCents,
      description: ocrData?.station_name || null,
      receiptPath,
      gallons: ocrData?.gallons || null,
      pricePerGallonCents: ocrData?.price_per_gallon
        ? Math.round(ocrData.price_per_gallon * 100)
        : null,
      fuelTotalCents: ocrData?.total ? Math.round(ocrData.total * 100) : null,
      stationName: ocrData?.station_name || null,
      ocrRaw: ocrDataStr,
      ocrConfidence: ocrData?.confidence || null,
    })
    .returning();

  notifyExpenseAdded({
    companyId: session.companyId,
    driverName: session.name,
    category,
    amountCents,
    stationName: ocrData?.station_name || null,
  });

  return NextResponse.json({ expense: result });
}
