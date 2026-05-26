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

  // Find active trip
  const activeTrip = db
    .select()
    .from(trips)
    .where(
      and(eq(trips.driverId, session.userId), eq(trips.status, "active"))
    )
    .get();

  if (!activeTrip) {
    return NextResponse.json(
      { error: "No active trip to end" },
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

  const result = db
    .update(trips)
    .set({
      status: "completed",
      endOdometer: mileage,
      endPhotoPath: filePath,
      endOcrRaw: ocrRaw,
      endOcrConfidence: confidence,
      endedAt: new Date().toISOString(),
    })
    .where(eq(trips.id, activeTrip.id))
    .returning()
    .get();

  return NextResponse.json({ trip: result });
}
