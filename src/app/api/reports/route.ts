import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditReports } from "@/db/schema";
import { desc } from "drizzle-orm";
import { generateDailyReport } from "@/lib/report";

export async function GET() {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const reports = db
    .select()
    .from(auditReports)
    .orderBy(desc(auditReports.reportDate))
    .all();

  return NextResponse.json({ reports });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { date } = await req.json();
  const reportDate = date || new Date().toISOString().split("T")[0];

  const report = await generateDailyReport(reportDate);
  return NextResponse.json({ report });
}
