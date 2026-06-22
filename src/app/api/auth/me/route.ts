import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ user: null });
  }

  const [user] = await db
    .select({
      autoLogoutMidnight: users.autoLogoutMidnight,
      ledgerEnabled: users.ledgerEnabled,
      ledgerFeePercent: users.ledgerFeePercent,
      preTripInspectionEnabled: users.preTripInspectionEnabled,
    })
    .from(users)
    .where(eq(users.id, session.userId));

  return NextResponse.json({
    user: {
      userId: session.userId,
      role: session.role,
      name: session.name,
      autoLogoutMidnight: user?.autoLogoutMidnight ?? true,
      ledgerEnabled: user?.ledgerEnabled ?? false,
      ledgerFeePercent: user?.ledgerFeePercent ?? 12,
      preTripInspectionEnabled: user?.preTripInspectionEnabled ?? true,
    },
  });
}
