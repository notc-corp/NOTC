"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface BillingInfo {
  companyName: string;
  subscriptionStatus: string;
  planName: string;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
}

function trialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    trial: "bg-amber-100 text-amber-700",
    active: "bg-green-100 text-green-700",
    past_due: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-600",
  };
  const labels: Record<string, string> = {
    trial: "Trial",
    active: "Active",
    past_due: "Past Due",
    cancelled: "Cancelled",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function BillingContent() {
  const params = useSearchParams();
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (params.get("success") === "1") setMessage("✅ Subscription activated! Thank you.");
    if (params.get("cancelled") === "1") setMessage("Checkout cancelled — no charge was made.");
    fetch("/api/billing/info")
      .then((r) => r.json())
      .then((d) => { setInfo(d); setLoading(false); });
  }, [params]);

  const handleCheckout = async () => {
    setActionLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { setMessage(data.error ?? "Could not start checkout"); setActionLoading(false); }
  };

  const handlePortal = async () => {
    setActionLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { setMessage(data.error ?? "Could not open portal"); setActionLoading(false); }
  };

  if (loading) return <div className="text-slate-500 text-center py-12">Loading...</div>;
  if (!info) return null;

  const daysLeft = trialDaysLeft(info.trialEndsAt);
  const isActive = info.subscriptionStatus === "active";
  const isTrial = info.subscriptionStatus === "trial";
  const isPastDue = info.subscriptionStatus === "past_due";

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Billing</h1>

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-slate-100 text-slate-600"}`}>
          {message}
        </div>
      )}

      {/* Current plan card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Current plan</p>
              <p className="text-xl font-bold text-slate-800 mt-0.5 capitalize">
                {info.planName === "trial" ? "Free Trial" : info.planName === "solo" ? "Solo — $9/mo" : info.planName}
              </p>
            </div>
            <StatusBadge status={info.subscriptionStatus} />
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          {isTrial && daysLeft !== null && (
            <div className={`rounded-xl p-3 ${daysLeft <= 7 ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"}`}>
              <p className={`text-sm font-medium ${daysLeft <= 7 ? "text-red-700" : "text-amber-700"}`}>
                {daysLeft === 0
                  ? "Your trial has expired."
                  : `Trial expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.`}
              </p>
              <p className={`text-xs mt-0.5 ${daysLeft <= 7 ? "text-red-600" : "text-amber-600"}`}>
                Subscribe to keep all your data and access.
              </p>
            </div>
          )}

          {isPastDue && (
            <div className="rounded-xl p-3 bg-red-50 border border-red-200">
              <p className="text-sm font-medium text-red-700">Payment failed — please update your payment method.</p>
            </div>
          )}

          {/* Features */}
          <ul className="space-y-2 text-sm text-slate-600">
            {[
              "Unlimited drivers",
              "Pre/Post trip inspections (DOT-compliant)",
              "Gross Ledger with OCR",
              "GPS fleet map",
              "Receipt OCR (AI)",
              "Telegram alerts",
              "CSV/PDF exports",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-green-500 font-bold">✓</span> {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="px-5 pb-5">
          {!isActive ? (
            <button
              onClick={handleCheckout}
              disabled={actionLoading}
              className="w-full h-12 rounded-xl bg-amber-600 text-white font-bold disabled:opacity-40 active:bg-amber-700 transition-colors"
            >
              {actionLoading ? "Redirecting..." : "Subscribe — $9/month"}
            </button>
          ) : (
            <button
              onClick={handlePortal}
              disabled={actionLoading}
              className="w-full h-12 rounded-xl border border-slate-300 text-slate-700 font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              {actionLoading ? "Redirecting..." : "Manage subscription"}
            </button>
          )}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 space-y-3 text-sm text-slate-600">
        <h2 className="font-semibold text-slate-800">Questions</h2>
        <div>
          <p className="font-medium text-slate-700">What happens after trial?</p>
          <p className="text-slate-500">Your data is kept. Subscribe to continue access.</p>
        </div>
        <div>
          <p className="font-medium text-slate-700">Can I cancel anytime?</p>
          <p className="text-slate-500">Yes — cancel from "Manage subscription" with no penalties.</p>
        </div>
        <div>
          <p className="font-medium text-slate-700">Is payment secure?</p>
          <p className="text-slate-500">Payments processed by Stripe. We never store your card number.</p>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="text-slate-500 text-center py-12">Loading...</div>}>
      <BillingContent />
    </Suspense>
  );
}
