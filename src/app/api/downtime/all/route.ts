import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { downtimeEvents } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const results = db.select().from(downtimeEvents)
    .orderBy(desc(downtimeEvents.startedAt))
    .all();

  return NextResponse.json({ downtimes: results });
}
