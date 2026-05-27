import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenses, trips } from "@/db/schema";
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

  const [expRows, tripRows] = await Promise.all([
    db.select().from(expenses).where(gte(expenses.createdAt, since)).orderBy(desc(expenses.createdAt)),
    db.select().from(trips).where(gte(trips.startedAt, since)).orderBy(desc(trips.startedAt)),
  ]);

  const totalExpCents = expRows.reduce((s, e) => s + e.amountCents, 0);
  const fuelExpCents = expRows.filter(e => e.category === "fuel").reduce((s, e) => s + e.amountCents, 0);
  const completedTrips = tripRows.filter(t => t.status === "completed");
  const totalMiles = completedTrips.reduce((s, t) => {
    if (t.endOdometer && t.startOdometer) return s + (t.endOdometer - t.startOdometer);
    return s;
  }, 0);

  const byCategory: Record<string, number> = {};
  for (const e of expRows) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amountCents;
  }

  const prompt = `You are writing a business performance report for a trucking owner-operator. Be professional but conversational. Use plain English, no jargon.

Period: Last ${days} days
Trips: ${tripRows.length} total, ${completedTrips.length} completed
Total miles driven: ${totalMiles.toLocaleString()} miles
Total expenses: $${(totalExpCents / 100).toFixed(2)}
Fuel costs: $${(fuelExpCents / 100).toFixed(2)} (${totalExpCents > 0 ? Math.round(fuelExpCents / totalExpCents * 100) : 0}% of expenses)
Cost per mile: ${totalMiles > 0 ? "$" + (totalExpCents / 100 / totalMiles).toFixed(3) : "N/A"}

Expenses by category:
${Object.entries(byCategory).map(([cat, cents]) => `  ${cat}: $${(cents / 100).toFixed(2)}`).join("\n")}

Write a report with these sections:
1. **Overview** (2-3 sentences summarizing the period)
2. **Performance Highlights** (2-3 bullet points of positives)
3. **Areas to Watch** (1-2 bullet points of concerns or things to monitor)
4. **Recommendation** (1 actionable recommendation)

Keep it under 250 words total.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const report = response.content[0].type === "text" ? response.content[0].text : "Report unavailable.";

  return NextResponse.json({
    report,
    stats: {
      days,
      totalTrips: tripRows.length,
      completedTrips: completedTrips.length,
      totalMiles,
      totalExpenses: totalExpCents,
      fuelExpenses: fuelExpCents,
    }
  });
}
