import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const sess = event.data.object as Stripe.Checkout.Session;
      const companyId = sess.metadata?.companyId ? parseInt(sess.metadata.companyId) : null;
      if (!companyId || !sess.customer || !sess.subscription) break;
      await db
        .update(companies)
        .set({
          stripeCustomerId: String(sess.customer),
          stripeSubscriptionId: String(sess.subscription),
          subscriptionStatus: "active",
          planName: "solo",
          trialEndsAt: null,
        })
        .where(eq(companies.id, companyId));
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const status = sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "cancelled";
      await db
        .update(companies)
        .set({ subscriptionStatus: status })
        .where(eq(companies.stripeSubscriptionId, sub.id));
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await db
        .update(companies)
        .set({ subscriptionStatus: "cancelled", stripeSubscriptionId: null, planName: "trial" })
        .where(eq(companies.stripeSubscriptionId, sub.id));
      break;
    }

    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      const subId = (inv as unknown as { subscription?: string }).subscription;
      if (subId) {
        await db
          .update(companies)
          .set({ subscriptionStatus: "past_due" })
          .where(eq(companies.stripeSubscriptionId, subId));
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
