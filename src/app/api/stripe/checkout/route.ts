import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

const PRICE_ID = process.env.STRIPE_SOLO_PRICE_ID;

export async function POST() {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.STRIPE_SECRET_KEY || !PRICE_ID) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, session.companyId!));

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    customer: company.stripeCustomerId ?? undefined,
    customer_email: company.stripeCustomerId ? undefined : undefined,
    metadata: { companyId: String(company.id) },
    success_url: `${appUrl}/owner/billing?success=1`,
    cancel_url: `${appUrl}/owner/billing?cancelled=1`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
