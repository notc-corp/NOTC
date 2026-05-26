import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = `You are parsing a voice command from a truck driver adding an expense.
Extract expense details from this text and return ONLY valid JSON.

Categories: fuel, tolls, maintenance, food, other

Return this exact format:
{
  "category": "fuel" | "tolls" | "maintenance" | "food" | "other",
  "amount": <number in dollars or null>,
  "description": "<station name or short description or null>",
  "gallons": <number or null, only for fuel>,
  "price_per_gallon": <number in dollars or null, only for fuel>,
  "confidence": <0.0 to 1.0>
}

Examples:
- "filled up 80 gallons for 320 dollars at loves in Texas" → fuel, 320, "Loves", 80, 4.0
- "paid 45 at the toll booth" → tolls, 45, null, null, null
- "spent 28 dollars on food at McDonald's" → food, 28, "McDonald's", null, null`;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [{ role: "user", content: `${PROMPT}\n\nVoice input: "${text}"` }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return NextResponse.json(match ? JSON.parse(match[0]) : { confidence: 0 });
  } catch {
    return NextResponse.json({ confidence: 0 });
  }
}
