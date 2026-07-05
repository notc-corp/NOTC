import { db } from "@/lib/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";

export type SubscriptionStatus = "active" | "trial" | "past_due" | "cancelled" | "expired";

export interface SubscriptionState {
  status: SubscriptionStatus;
  /** Days left in trial (null if not on trial) */
  trialDaysLeft: number | null;
  /** Whether write operations (POST/PATCH/DELETE) are allowed */
  canWrite: boolean;
}

export async function getSubscriptionState(companyId: number): Promise<SubscriptionState> {
  const [company] = await db
    .select({
      subscriptionStatus: companies.subscriptionStatus,
      trialEndsAt: companies.trialEndsAt,
    })
    .from(companies)
    .where(eq(companies.id, companyId));

  if (!company) {
    return { status: "cancelled", trialDaysLeft: null, canWrite: false };
  }

  const raw = company.subscriptionStatus ?? "trial";

  if (raw === "active") {
    return { status: "active", trialDaysLeft: null, canWrite: true };
  }

  if (raw === "past_due") {
    // Grace period — still allow writes
    return { status: "past_due", trialDaysLeft: null, canWrite: true };
  }

  if (raw === "trial") {
    if (!company.trialEndsAt) {
      // No expiry set → unlimited trial (dev/seed company)
      return { status: "trial", trialDaysLeft: null, canWrite: true };
    }
    const msLeft = new Date(company.trialEndsAt).getTime() - Date.now();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) {
      return { status: "expired", trialDaysLeft: 0, canWrite: false };
    }
    return { status: "trial", trialDaysLeft: daysLeft, canWrite: true };
  }

  // cancelled or unknown
  return { status: "cancelled", trialDaysLeft: null, canWrite: false };
}
