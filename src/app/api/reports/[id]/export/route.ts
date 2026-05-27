import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditReports } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await params;
  const report = (await db
    .select()
    .from(auditReports)
    .where(eq(auditReports.id, parseInt(id))))[0];

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const data = JSON.parse(report.reportJson);
  const rows: string[] = [];

  // Header
  rows.push("Driver,Truck,Trip ID,Miles,Expected Gallons,Actual Gallons,Actual MPG,Expected Cost,Actual Cost,Variance,Anomalies");

  for (const ds of data.driver_summaries || []) {
    for (const trip of ds.trips || []) {
      rows.push(
        [
          `"${ds.driver_name}"`,
          `"${ds.truck_number || ""}"`,
          trip.trip_id,
          trip.miles_driven,
          trip.expected_gallons,
          trip.actual_gallons,
          trip.actual_mpg || "",
          (trip.expected_fuel_cost_cents / 100).toFixed(2),
          (trip.actual_fuel_cost_cents / 100).toFixed(2),
          (trip.variance_cents / 100).toFixed(2),
          `"${trip.anomalies.join("; ")}"`,
        ].join(",")
      );
    }
  }

  const csv = rows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="audit-report-${report.reportDate}.csv"`,
    },
  });
}
