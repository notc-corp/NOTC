import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenses } from "@/db/schema";
import { gte, desc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") || "30");
  const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

  const rows = await db.select().from(expenses).where(gte(expenses.createdAt, since))
    .orderBy(desc(expenses.createdAt));

  if (rows.length === 0) {
    return NextResponse.json({ insights: [], anomalies: [], forecast: null, summary: "No expenses in this period." });
  }

  // Compute stats in code before sending to Claude
  const totalCents = rows.reduce((s, e) => s + e.amountCents, 0);
  const byCategory: Record<string, { count: number; totalCents: number }> = {};
  for (const e of rows) {
    if (!byCategory[e.category]) byCategory[e.category] = { count: 0, totalCents: 0 };
    byCategory[e.category].count++;
    byCategory[e.category].totalCents += e.amountCents;
  }

  // Daily totals for trend
  const byDay: Record<string, number> = {};
  for (const e of rows) {
    const day = e.createdAt.split("T")[0].split(" ")[0];
    byDay[day] = (byDay[day] || 0) + e.amountCents;
  }
  const dailyValues = Object.values(byDay);
  const avgDaily = dailyValues.reduce((s, v) => s + v, 0) / (dailyValues.length || 1);

  const statsText = `
Period: last ${days} days
Total expenses: ${rows.length} transactions, $${(totalCents / 100).toFixed(2)} total
Average daily spend: $${(avgDaily / 100).toFixed(2)}

By category:
${Object.entries(byCategory).map(([cat, v]) => `  ${cat}: ${v.count} transactions, $${(v.totalCents / 100).toFixed(2)}`).join("\n")}

Daily totals (last ${Math.min(14, dailyValues.length)} days):
${Object.entries(byDay).slice(-14).map(([d, v]) => `  ${d}: $${(v / 100).toFixed(2)}`).join("\n")}

Individual transactions (last 20):
${rows.slice(0, 20).map(e => `  ${e.createdAt.split("T")[0]} ${e.category} $${(e.amountCents / 100).toFixed(2)}${e.stationName ? ` at ${e.stationName}` : ""}`).join("\n")}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [{
      role: "user",
      content: `You are analyzing trucking business expenses for a fleet owner. Be concise and practical.

${statsText}

Return ONLY valid JSON:
{
  "summary": "<2-3 sentence plain English summary of spending>",
  "insights": ["<insight 1>", "<insight 2>", "<insight 3>"],
  "anomalies": ["<anomaly 1 if any>"],
  "forecast": "<estimated monthly spend based on trend>"
}`
    }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return NextResponse.json(match ? JSON.parse(match[0]) : { summary: raw, insights: [], anomalies: [] });
  } catch {
    return NextResponse.json({ summary: "Analysis unavailable.", insights: [], anomalies: [] });
  }
}
