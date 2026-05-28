import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { trips } from "@/db/schema";
import { saveUpload } from "@/lib/upload";
import { extractOdometer } from "@/lib/ocr";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check for existing active trip
  const activeTrips = await db
    .select()
    .from(trips)
    .where(
      and(eq(trips.driverId, session.userId), eq(trips.status, "active"))
    );

  if (activeTrips.length > 0) {
    return NextResponse.json(
      { error: "You already have an active trip" },
      { status: 400 }
    );
  }

  const formData = await req.formData();
  const photo = formData.get("photo") as File;
  const manualMileage = formData.get("mileage") as string;

  let filePath: string | null = null;
  let ocrRaw: string | null = null;
  let confidence: number | null = null;
  let mileage: number | null = manualMileage ? parseFloat(manualMileage) : null;

  if (photo) {
    filePath = await saveUpload(photo, "odometer");
    // Only run OCR if mileage wasn't provided by the client (already confirmed by user)
    if (!mileage) {
      const ocrResult = await extractOdometer(filePath);
      ocrRaw = JSON.stringify(ocrResult);
      confidence = ocrResult.confidence;
      if (ocrResult.mileage) {
        mileage = ocrResult.mileage;
      }
    }
  }

  const [result] = await db
    .insert(trips)
    .values({
      driverId: session.userId,
      companyId: session.companyId ?? null,
      status: "active",
      startOdometer: mileage,
      startPhotoPath: filePath,
      startOcrRaw: ocrRaw,
      startOcrConfidence: confidence,
    })
    .returning();

  return NextResponse.json({ trip: result });
}
