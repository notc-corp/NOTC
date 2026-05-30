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

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Earnings</h1>
        {rate && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg font-medium active:bg-amber-700"
          >
            {showForm ? "Cancel" : "+ Add"}
          </button>
        )}
      </div>

      {/* Rate + Balance */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Current rate</p>
          {rate ? (
            <p className="font-semibold text-slate-800">
              {fmt(rate.rateCents)} / {rate.type === "per_ton" ? "ton" : "hour"}
            </p>
          ) : (
            <p className="text-amber-600 font-medium">Not set — contact manager</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Unpaid balance</p>
          <p className={`text-2xl font-bold ${unpaidTotal > 0 ? "text-green-600" : "text-slate-400"}`}>
            {fmt(unpaidTotal)}
          </p>
        </div>
      </div>

      {/* Add Entry Form */}
      {showForm && rate && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <h2 className="font-semibold text-slate-900">
            {rate.type === "per_ton" ? "Log Load" : "Log Hours"}
          </h2>

          <input
            type="date"
            value={form.entryDate}
            onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
            className="w-full h-12 rounded-lg bg-white px-4 text-slate-800 border border-slate-300 focus:border-amber-600 focus:outline-none"
          />

          {rate.type === "per_ton" ? (
            <>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="Tons *"
                value={form.tons}
                onChange={(e) => setForm({ ...form, tons: e.target.value })}
                className="w-full h-12 rounded-lg bg-white px-4 text-slate-800 border border-slate-300 focus:border-amber-600 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Customer (optional)"
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
                className="w-full h-12 rounded-lg bg-white px-4 text-slate-800 border border-slate-300 focus:border-amber-600 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Load type (optional, e.g. gravel)"
                value={form.loadType}
                onChange={(e) => setForm({ ...form, loadType: e.target.value })}
                className="w-full h-12 rounded-lg bg-white px-4 text-slate-800 border border-slate-300 focus:border-amber-600 focus:outline-none"
              />
            </>
          ) : (
            <input
              type="number"
              step="0.25"
              min="0"
              placeholder="Hours worked *"
              value={form.hours}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
              className="w-full h-12 rounded-lg bg-white px-4 text-slate-800 border border-slate-300 focus:border-amber-600 focus:outline-none"
            />
          )}

          <input
            type="text"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full h-12 rounded-lg bg-white px-4 text-slate-800 border border-slate-300 focus:border-amber-600 focus:outline-none"
          />

          {/* Preview total */}
          {((rate.type === "per_ton" && form.tons) || (rate.type === "hourly" && form.hours)) && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-green-700 font-semibold">
              Estimated: {fmt(
                rate.type === "per_ton"
                  ? Math.round(rate.rateCents * parseFloat(form.tons || "0"))
                  : Math.round(rate.rateCents * parseFloat(form.hours || "0"))
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || (rate.type === "per_ton" ? !form.tons : !form.hours)}
            className="w-full h-12 rounded-lg bg-green-600 text-white font-bold disabled:opacity-40 active:bg-green-700"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      )}

      {/* Entries */}
      <div>
        <h2 className="text-base font-semibold text-slate-600 mb-2">Work log</h2>
        {entries.length === 0 ? (
          <p className="text-slate-400 text-center py-6">No entries yet</p>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <div
                key={e.id}
                className={`bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between ${
                  e.paymentId ? "opacity-60" : "border-slate-200"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">
                      {e.type === "per_ton"
                        ? `${e.tons} t${e.customer ? ` · ${e.customer}` : ""}${e.loadType ? ` · ${e.loadType}` : ""}`
                        : `${e.hours} h`}
                    </span>
                    {e.paymentId && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">paid</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {e.entryDate} · {fmt(e.rateCents)}/{e.type === "per_ton" ? "ton" : "hr"}
                    {e.notes ? ` · ${e.notes}` : ""}
                  </p>
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
          <h2 className="text-base font-semibold text-slate-600 mb-2">Payment history</h2>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-800">Payment received</p>
                  <p className="text-xs text-green-600">
                    {new Date(p.paidAt).toLocaleDateString()}
                    {p.notes ? ` · ${p.notes}` : ""}
                  </p>
                </div>
                <span className="font-bold text-green-700 text-lg">{fmt(p.amountCents)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
