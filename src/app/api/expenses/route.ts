import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenses, trips } from "@/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { saveUpload } from "@/lib/upload";

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

  // Drivers can only see their own expenses
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

  const results = db
    .select()
    .from(expenses)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(expenses.createdAt))
    .all();

  return NextResponse.json({ expenses: results });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";

  // JSON body — used by batch receipt save from scan flow
  if (contentType.includes("application/json")) {
    const body = await req.json();

    const targetDriverId = session.userId;
    // After end trip: find most recent trip (completed or active)
    const activeTrip = db
      .select()
      .from(trips)
      .where(and(eq(trips.driverId, targetDriverId), eq(trips.status, "active")))
      .get() || db
      .select()
      .from(trips)
      .where(and(eq(trips.driverId, targetDriverId), eq(trips.status, "completed")))
      .orderBy(desc(trips.endedAt))
      .get();

    const result = db
      .insert(expenses)
      .values({
        tripId: activeTrip?.id || null,
        driverId: targetDriverId,
        uploadedBy: session.userId,
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
      .returning()
      .get();

    return NextResponse.json({ expense: result });
  }

  // FormData body — used by driver receipt photo upload
  const formData = await req.formData();
  const photo = formData.get("photo") as File | null;
  const category = formData.get("category") as string;
  const ocrDataStr = formData.get("ocrData") as string | null;
  const driverIdStr = formData.get("driverId") as string | null;

  // Owner can submit on behalf of a driver
  const targetDriverId =
    session.role === "owner" && driverIdStr
      ? parseInt(driverIdStr)
      : session.userId;

  // Find active trip for this driver
  const activeTrip = db
    .select()
    .from(trips)
    .where(
      and(eq(trips.driverId, targetDriverId), eq(trips.status, "active"))
    )
    .get();

  let receiptPath: string | null = null;
  if (photo) {
    receiptPath = await saveUpload(photo, "receipts");
  }

  let ocrData = null;
  if (ocrDataStr) {
    try {
      ocrData = JSON.parse(ocrDataStr);
    } catch {
      // Ignore parse errors
    }
  }

  const amountCents = ocrData?.total
    ? Math.round(ocrData.total * 100)
    : 0;

  const result = db
    .insert(expenses)
    .values({
      tripId: activeTrip?.id || null,
      driverId: targetDriverId,
      uploadedBy: session.userId,
      category: category as "fuel" | "tolls" | "maintenance" | "food" | "other",
      amountCents,
      description: ocrData?.station_name || null,
      receiptPath,
      gallons: ocrData?.gallons || null,
      pricePerGallonCents: ocrData?.price_per_gallon
        ? Math.round(ocrData.price_per_gallon * 100)
        : null,
      fuelTotalCents: ocrData?.total
        ? Math.round(ocrData.total * 100)
        : null,
      stationName: ocrData?.station_name || null,
      ocrRaw: ocrDataStr,
      ocrConfidence: ocrData?.confidence || null,
    })
    .returning()
    .get();

  return NextResponse.json({ expense: result });
}
