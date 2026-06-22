"use client";

import { useEffect, useState } from "react";

interface SalaryRate {
  type: "hourly" | "per_ton";
  rateCents: number;
}

interface SalaryEntry {
  id: number;
  type: "hourly" | "per_ton";
  customer: string | null;
  loadType: string | null;
  tons: number | null;
  hours: number | null;
  rateCents: number;
  totalCents: number;
  notes: string | null;
  entryDate: string;
  paymentId: number | null;
}

interface SalaryPayment {
  id: number;
  amountCents: number;
  notes: string | null;
  paidAt: string;
}

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const today = () => new Date().toISOString().slice(0, 10);

const fieldLabel = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";
const fieldInput =
  "w-full h-12 rounded-xl bg-white px-4 text-slate-800 border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 focus:outline-none transition-colors";

export default function DriverSalaryPage() {
  const [rate, setRate] = useState<SalaryRate | null>(null);
  const [entries, setEntries] = useState<SalaryEntry[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer: "",
    loadType: "",
    tons: "",
    hours: "",
    notes: "",
    entryDate: today(),
  });

  const load = async () => {
    const [meRes, entriesRes, paymentsRes] = await Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/salary/entries").then((r) => r.json()),
      fetch("/api/salary/payments").then((r) => r.json()),
    ]);
    const userId = meRes.user?.userId;
    if (userId) {
      const rateRes = await fetch(`/api/salary/rates/${userId}`).then((r) => r.json());
      setRate(rateRes.rate);
    }
    setEntries(entriesRes.entries || []);
    setPayments(paymentsRes.payments || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!rate) return;
    setSubmitting(true);
    const body: Record<string, string | number> = {
      type: rate.type,
      entryDate: form.entryDate,
    };
    if (rate.type === "per_ton") {
      if (!form.tons) { setSubmitting(false); return; }
      body.tons = parseFloat(form.tons);
      if (form.customer) body.customer = form.customer;
      if (form.loadType) body.loadType = form.loadType;
    } else {
      if (!form.hours) { setSubmitting(false); return; }
      body.hours = parseFloat(form.hours);
    }
    if (form.notes) body.notes = form.notes;

    const res = await fetch("/api/salary/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setForm({ customer: "", loadType: "", tons: "", hours: "", notes: "", entryDate: today() });
      setShowForm(false);
      load();
    }
    setSubmitting(false);
  };

  const unpaidTotal = entries
    .filter((e) => !e.paymentId)
    .reduce((sum, e) => sum + e.totalCents, 0);

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 w-40 bg-slate-200 rounded-lg" />
        <div className="h-28 bg-slate-200 rounded-2xl" />
        <div className="h-5 w-24 bg-slate-200 rounded" />
        <div className="h-16 bg-slate-200 rounded-xl" />
        <div className="h-16 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Earnings</h1>
        {rate && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-amber-600 text-white px-4 py-2 rounded-xl font-medium shadow-sm active:scale-95 active:bg-amber-700 transition-all"
          >
            {showForm ? "Cancel" : "+ Add"}
          </button>
        )}
      </div>

      {/* Hero balance card */}
      {rate ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 p-5 text-white shadow-md">
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute -right-2 bottom-2 w-16 h-16 rounded-full bg-white/10" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium">Unpaid balance</p>
              <p className="text-4xl font-bold tracking-tight mt-1">{fmt(unpaidTotal)}</p>
            </div>
            <div className="text-right">
              <p className="text-amber-100 text-xs uppercase tracking-wide">Rate</p>
              <p className="font-semibold mt-1">
                {fmt(rate.rateCents)} <span className="text-amber-100 font-normal">/ {rate.type === "per_ton" ? "ton" : "hour"}</span>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-100 border border-slate-200 p-5 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <p className="text-slate-600 font-medium">Rate not set — contact your manager</p>
        </div>
      )}

      {/* Add Entry Form */}
      {showForm && rate && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <span>{rate.type === "per_ton" ? "🪨" : "⏱️"}</span>
            {rate.type === "per_ton" ? "Log Load" : "Log Hours"}
          </h2>

          <div>
            <label className={fieldLabel}>Date</label>
            <input
              type="date"
              value={form.entryDate}
              onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
              className={fieldInput}
            />
          </div>

          {rate.type === "per_ton" ? (
            <>
              <div>
                <label className={fieldLabel}>Tons *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={form.tons}
                  onChange={(e) => setForm({ ...form, tons: e.target.value })}
                  className={fieldInput}
                />
              </div>
              <div>
                <label className={fieldLabel}>Customer</label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={form.customer}
                  onChange={(e) => setForm({ ...form, customer: e.target.value })}
                  className={fieldInput}
                />
              </div>
              <div>
                <label className={fieldLabel}>Load type</label>
                <input
                  type="text"
                  placeholder="e.g. gravel"
                  value={form.loadType}
                  onChange={(e) => setForm({ ...form, loadType: e.target.value })}
                  className={fieldInput}
                />
              </div>
            </>
          ) : (
            <div>
              <label className={fieldLabel}>Hours worked *</label>
              <input
                type="number"
                step="0.25"
                min="0"
                placeholder="0.0"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                className={fieldInput}
              />
            </div>
          )}

          <div>
            <label className={fieldLabel}>Notes</label>
            <input
              type="text"
              placeholder="Optional"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={fieldInput}
            />
          </div>

          {/* Preview total */}
          {((rate.type === "per_ton" && form.tons) || (rate.type === "hourly" && form.hours)) && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <span className="text-green-700 text-sm font-medium">Estimated total</span>
              <span className="text-green-700 font-bold text-lg">
                {fmt(
                  rate.type === "per_ton"
                    ? Math.round(rate.rateCents * parseFloat(form.tons || "0"))
                    : Math.round(rate.rateCents * parseFloat(form.hours || "0"))
                )}
              </span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || (rate.type === "per_ton" ? !form.tons : !form.hours)}
            className="w-full h-12 rounded-xl bg-green-600 text-white font-bold shadow-sm disabled:opacity-40 disabled:shadow-none active:scale-[0.98] active:bg-green-700 transition-all"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      )}

      {/* Entries */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Work log</h2>
        {entries.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-slate-400 text-sm">No entries yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <div
                key={e.id}
                className={`relative bg-white rounded-xl border shadow-sm p-4 pl-5 flex items-center justify-between transition-opacity overflow-hidden ${
                  e.paymentId ? "border-slate-200 opacity-70" : "border-slate-200"
                }`}
              >
                <span
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    e.paymentId ? "bg-slate-300" : "bg-amber-500"
                  }`}
                />
                <div className="flex items-center gap-3">
                  <span className="text-xl shrink-0">{e.type === "per_ton" ? "🪨" : "⏱️"}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">
                        {e.type === "per_ton"
                          ? `${e.tons} t${e.customer ? ` · ${e.customer}` : ""}${e.loadType ? ` · ${e.loadType}` : ""}`
                          : `${e.hours} h`}
                      </span>
                      {e.paymentId && (
                        <span className="flex items-center gap-0.5 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          ✓ paid
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {e.entryDate} · {fmt(e.rateCents)}/{e.type === "per_ton" ? "ton" : "hr"}
                      {e.notes ? ` · ${e.notes}` : ""}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-slate-800 shrink-0">{fmt(e.totalCents)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payments */}
      {payments.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Payment history</h2>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-green-600 text-white shrink-0">✓</span>
                <div className="flex-1">
                  <p className="font-medium text-green-800">Payment received</p>
                  <p className="text-xs text-green-600">
                    {new Date(p.paidAt).toLocaleDateString()}
                    {p.notes ? ` · ${p.notes}` : ""}
                  </p>
                </div>
                <span className="font-bold text-green-700 text-lg shrink-0">{fmt(p.amountCents)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
