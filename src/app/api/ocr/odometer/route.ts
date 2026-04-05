import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveUpload } from "@/lib/upload";
import { extractOdometer } from "@/lib/ocr";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await req.formData();
  const photo = formData.get("photo") as File;

  if (!photo) {
    return NextResponse.json({ error: "Photo required" }, { status: 400 });
  }

  const filePath = await saveUpload(photo, "odometer");
  const result = await extractOdometer(filePath);

  return NextResponse.json({ ...result, filePath });
}
