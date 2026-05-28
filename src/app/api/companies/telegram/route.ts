import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companies } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session.companyId) {
    return NextResponse.json({ error: "No company" }, { status: 400 });
  }

  const { telegramChatId } = await req.json();

  const [result] = await db
    .update(companies)
    .set({ telegramChatId: telegramChatId || null })
    .where(eq(companies.id, session.companyId))
    .returning({ telegramChatId: companies.telegramChatId });

  return NextResponse.json({ telegramChatId: result.telegramChatId });
}
