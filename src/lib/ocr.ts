import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function readImageAsBase64(imagePath: string): Promise<string> {
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    const res = await fetch(imagePath);
    const buf = await res.arrayBuffer();
    return Buffer.from(buf).toString("base64");
  }
  return fs.readFileSync(imagePath).toString("base64");
}

export interface OdometerResult {
  mileage: number | null;
  confidence: number;
  display_type: "digital" | "analog" | "unknown";
  notes: string;
}

export interface ReceiptResult {
  station_name: string | null;
  date: string | null;
  fuel_type: string | null;
  gallons: number | null;
  price_per_gallon: number | null;
  total: number | null;
  confidence: number;
  notes: string;
}

const ODOMETER_PROMPT = `You are analyzing a photo of a truck dashboard odometer.
Extract the current mileage reading from the odometer.

Return ONLY valid JSON in this exact format:
{
  "mileage": <number or null if unreadable>,
  "confidence": <0.0 to 1.0>,
  "display_type": "digital" | "analog" | "unknown",
  "notes": "<any issues like glare, partial obstruction, etc.>"
}

If you cannot read the mileage at all, set mileage to null and confidence to 0.`;

const RECEIPT_PROMPT = `You are analyzing a photo of a fuel receipt from a gas station or truck stop.
Extract the following information.

Return ONLY valid JSON in this exact format:
{
  "station_name": "<string or null>",
  "date": "<YYYY-MM-DD or null>",
  "fuel_type": "<regular, premium, diesel, or null>",
  "gallons": <number or null>,
  "price_per_gallon": <number in dollars or null>,
  "total": <number in dollars or null>,
  "confidence": <0.0 to 1.0>,
  "notes": "<any issues or additional info>"
}

If this is not a fuel receipt, still extract what you can and note the receipt type in notes.`;

function getMediaType(
  filePath: string
): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  const ext = filePath.toLowerCase().split(".").pop();
  switch (ext) {
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

export async function extractOdometer(
  imagePath: string
): Promise<OdometerResult> {
  const base64 = await readImageAsBase64(imagePath);
  const mediaType = getMediaType(imagePath);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          { type: "text", text: ODOMETER_PROMPT },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  try {
    // Extract JSON from potential markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch
      ? JSON.parse(jsonMatch[0])
      : { mileage: null, confidence: 0, display_type: "unknown", notes: "Failed to parse response" };
  } catch {
    return {
      mileage: null,
      confidence: 0,
      display_type: "unknown",
      notes: "Failed to parse OCR response",
    };
  }
}

export async function extractReceipt(
  imagePath: string
): Promise<ReceiptResult> {
  const base64 = await readImageAsBase64(imagePath);
  const mediaType = getMediaType(imagePath);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          { type: "text", text: RECEIPT_PROMPT },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch
      ? JSON.parse(jsonMatch[0])
      : {
          station_name: null,
          date: null,
          fuel_type: null,
          gallons: null,
          price_per_gallon: null,
          total: null,
          confidence: 0,
          notes: "Failed to parse response",
        };
  } catch {
    return {
      station_name: null,
      date: null,
      fuel_type: null,
      gallons: null,
      price_per_gallon: null,
      total: null,
      confidence: 0,
      notes: "Failed to parse OCR response",
    };
  }
}
