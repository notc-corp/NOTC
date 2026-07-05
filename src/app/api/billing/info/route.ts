import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.companyId) {
    return NextResponse.json({ error: "No company" }, { status: 404 });
  }

  const [company] = await db
    .select({
      name: companies.name,
      subscriptionStatus: companies.subscriptionStatus,
      planName: companies.planName,
      trialEndsAt: companies.trialEndsAt,
      stripeCustomerId: companies.stripeCustomerId,
    })
    .from(companies)
    .where(eq(companies.id, session.companyId));

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  return NextResponse.json({
    companyName: company.name,
    subscriptionStatus: company.subscriptionStatus ?? "trial",
    planName: company.planName ?? "trial",
    trialEndsAt: company.trialEndsAt ?? null,
    stripeCustomerId: company.stripeCustomerId ?? null,
  });
}
