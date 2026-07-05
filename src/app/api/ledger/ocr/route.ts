import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PUMP_PROMPT = `You are reading a fuel pump dispenser screen or a fuel receipt.
Extract: gallons dispensed and price per gallon (in US dollars).

Return ONLY valid JSON with no extra text:
{"gallons": <number or null>, "pricePerGallon": <number or null>}

Examples:
- Screen shows "18.346 GAL" and "$3.499/GAL" → {"gallons": 18.346, "pricePerGallon": 3.499}
- Receipt shows "15.201 gallons @ $3.499" → {"gallons": 15.201, "pricePerGallon": 3.499}
Use null for any value that is not visible or readable.`;

const ODOMETER_PROMPT = `You are reading a truck dashboard odometer (digital or analog display).
Extract the current mileage reading as a plain integer (no commas).

Return ONLY valid JSON with no extra text:
{"odometer": <integer or null>}

Examples:
- Display shows "178,432" → {"odometer": 178432}
- Analog dial reads "086541" → {"odometer": 86541}
Use null if the value is unreadable.`;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { image, mediaType = "image/jpeg", type } = await req.json();
  if (!image || !type) return NextResponse.json({ error: "image and type required" }, { status: 400 });

  const prompt = type === "odometer" ? ODOMETER_PROMPT : PUMP_PROMPT;

  try {
    const validMediaType = (["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mediaType)
      ? mediaType
      : "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: validMediaType, data: image } },
          { type: "text", text: prompt },
        ],
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Ledger OCR error:", err);
    return NextResponse.json({ error: "OCR failed" }, { status: 500 });
  }
}
