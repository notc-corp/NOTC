import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveUpload } from "@/lib/upload";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SCAN_PROMPT = `You are analyzing a photo that may contain one or more receipts (fuel, food, tolls, maintenance, etc).

Find ALL receipts visible in this image and extract data for each one.

Return ONLY a valid JSON array. Each element:
{
  "merchant": "<station/store name or null>",
  "date": "<YYYY-MM-DD or null>",
  "time": "<HH:MM or null>",
  "category": "fuel" | "food" | "tolls" | "maintenance" | "other",
  "amount": <total in dollars as number or null>,
  "gallons": <number or null>,
  "price_per_gallon": <number or null>,
  "fuel_type": "<diesel/regular/premium or null>",
  "notes": "<any relevant info, partial reads, issues>",
  "confidence": <0.0 to 1.0>
}

If there are no receipts visible, return an empty array [].
If there is exactly one receipt, return an array with one element.`;

function getMediaType(path: string): "image/jpeg" | "image/png" | "image/webp" {
  const ext = path.toLowerCase().split(".").pop();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await req.formData();
  const photos = formData.getAll("photos") as File[];

  if (!photos.length) {
    return NextResponse.json({ error: "No photos provided" }, { status: 400 });
  }

  const allReceipts: object[] = [];

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const filePath = await saveUpload(photo, "receipts");
    const imageData = fs.readFileSync(filePath);
    const base64 = imageData.toString("base64");
    const mediaType = getMediaType(filePath);

    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: SCAN_PROMPT },
            ],
          },
        ],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "[]";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const receipts = JSON.parse(jsonMatch[0]);
        // Tag each receipt with its source photo index
        receipts.forEach((r: object) => {
          allReceipts.push({ ...r, photoIndex: i, filePath });
        });
      }
    } catch {
      // Skip failed photos, continue with others
    }
  }

  return NextResponse.json({ receipts: allReceipts });
}
