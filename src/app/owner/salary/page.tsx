"use client";

import { useEffect, useState } from "react";

interface Driver {
  id: number;
  name: string;
  username: string | null;
  truckNumber: string | null;
}

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

export default function OwnerSalaryPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [rates, setRates] = useState<Record<number, SalaryRate | null>>({});
  const [entries, setEntries] = useState<Record<number, SalaryEntry[]>>({});
  const [payments, setPayments] = useState<Record<number, SalaryPayment[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);

  // Rate editing
  const [editingRate, setEditingRate] = useState<number | null>(null);
  const [rateForm, setRateForm] = useState({ type: "per_ton", rateCents: "" });

  // Pay modal
  const [payingDriver, setPayingDriver] = useState<number | null>(null);
  const [payForm, setPayForm] = useState({ amountCents: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const loadAll = async () => {
    const driversRes = await fetch("/api/users").then((r) => r.json());
    const driverList: Driver[] = driversRes.users || [];
    setDrivers(driverList);

    const ratesMap: Record<number, SalaryRate | null> = {};
    const entriesMap: Record<number, SalaryEntry[]> = {};
    const paymentsMap: Record<number, SalaryPayment[]> = {};

    await Promise.all(
      driverList.map(async (d) => {
        const [rateRes, entriesRes, paymentsRes] = await Promise.all([
          fetch(`/api/salary/rates/${d.id}`).then((r) => r.json()),
          fetch(`/api/salary/entries?driverId=${d.id}`).then((r) => r.json()),
          fetch(`/api/salary/payments?driverId=${d.id}`).then((r) => r.json()),
        ]);
        ratesMap[d.id] = rateRes.rate ?? null;
        entriesMap[d.id] = entriesRes.entries || [];
        paymentsMap[d.id] = paymentsRes.payments || [];
      })
    );

    setRates(ratesMap);
    setEntries(entriesMap);
    setPayments(paymentsMap);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const handleSetRate = async (driverId: number) => {
    const cents = parseInt(rateForm.rateCents);
    if (!cents || cents <= 0) return;
    setSubmitting(true);
    await fetch(`/api/salary/rates/${driverId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: rateForm.type, rateCents: cents }),
    });
    setEditingRate(null);
    setRateForm({ type: "per_ton", rateCents: "" });
    setSubmitting(false);
    loadAll();
  };

  const handlePay = async (driverId: number) => {
    const cents = Math.round(parseFloat(payForm.amountCents) * 100);
    if (!cents || cents <= 0) return;
    setSubmitting(true);
    await fetch("/api/salary/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId, amountCents: cents, notes: payForm.notes }),
    });
    setPayingDriver(null);
    setPayForm({ amountCents: "", notes: "" });
    setSubmitting(false);
    loadAll();
  };

  const unpaid = (driverId: number) =>
    (entries[driverId] || [])
      .filter((e) => !e.paymentId)
      .reduce((sum, e) => sum + e.totalCents, 0);

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Driver Salaries</h1>

      {/* Driver cards */}
      <div className="space-y-3">
        {drivers.map((driver) => {
          const rate = rates[driver.id];
          const balance = unpaid(driver.id);
          const isSelected = selectedDriver === driver.id;

          return (
            <div key={driver.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Summary row */}
              <div
                className="p-4 cursor-pointer active:bg-slate-50"
                onClick={() => setSelectedDriver(isSelected ? null : driver.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{driver.name}</p>
                    <p className="text-sm text-slate-500">
                      {rate
                        ? `${fmt(rate.rateCents)} / ${rate.type === "per_ton" ? "ton" : "hour"}`
                        : "No rate set"}
                      {driver.truckNumber ? ` · 🚛 ${driver.truckNumber}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Unpaid</p>
                      <p className={`font-bold text-lg ${balance > 0 ? "text-amber-600" : "text-slate-300"}`}>
                        {fmt(balance)}
                      </p>
                    </div>
                    <span className="text-slate-400 text-xl">{isSelected ? "▲" : "▼"}</span>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {isSelected && (
                <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50">
                  {/* Rate section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-600">Rate</p>
                      <button
                        onClick={() => {
                          setEditingRate(editingRate === driver.id ? null : driver.id);
                          if (rate) setRateForm({ type: rate.type, rateCents: (rate.rateCents / 100).toString() });
                        }}
                        className="text-xs text-amber-600 font-medium"
                      >
                        {editingRate === driver.id ? "Cancel" : "Change rate"}
                      </button>
                    </div>

                    {editingRate === driver.id ? (
                      <div className="space-y-2">
                        <select
                          value={rateForm.type}
                          onChange={(e) => setRateForm({ ...rateForm, type: e.target.value })}
                          className="w-full h-11 rounded-lg border border-slate-300 px-3 bg-white text-slate-800 focus:border-amber-600 focus:outline-none"
                        >
                          <option value="per_ton">Per ton</option>
                          <option value="hourly">Hourly</option>
                        </select>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={rateForm.rateCents}
                              onChange={(e) => setRateForm({ ...rateForm, rateCents: e.target.value })}
                              className="w-full h-11 rounded-lg border border-slate-300 pl-7 pr-4 bg-white text-slate-800 focus:border-amber-600 focus:outline-none"
                            />
                          </div>
                          <button
                            onClick={() => handleSetRate(driver.id)}
                            disabled={submitting || !rateForm.rateCents}
                            className="px-4 h-11 rounded-lg bg-amber-600 text-white font-medium disabled:opacity-40 active:bg-amber-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-700">
                        {rate ? `${fmt(rate.rateCents)} per ${rate.type === "per_ton" ? "ton" : "hour"}` : "—"}
                      </p>
                    )}
                  </div>

                  {/* Pay button */}
                  {balance > 0 && (
                    <div>
                      {payingDriver === driver.id ? (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-600">Record Payment</p>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder={`${(balance / 100).toFixed(2)}`}
                              value={payForm.amountCents}
                              onChange={(e) => setPayForm({ ...payForm, amountCents: e.target.value })}
                              className="w-full h-11 rounded-lg border border-slate-300 pl-7 pr-4 bg-white text-slate-800 focus:border-amber-600 focus:outline-none"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Notes (optional)"
                            value={payForm.notes}
                            onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                            className="w-full h-11 rounded-lg border border-slate-300 px-4 bg-white text-slate-800 focus:border-amber-600 focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => setPayingDriver(null)}
                              className="flex-1 h-11 rounded-lg border border-slate-200 text-slate-600 font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handlePay(driver.id)}
                              disabled={submitting || !payForm.amountCents}
                              className="flex-1 h-11 rounded-lg bg-green-600 text-white font-bold disabled:opacity-40 active:bg-green-700"
                            >
                              {submitting ? "..." : "Confirm Payment"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setPayingDriver(driver.id);
                            setPayForm({ amountCents: (balance / 100).toFixed(2), notes: "" });
                          }}
                          className="w-full h-11 rounded-lg bg-green-600 text-white font-bold active:bg-green-700"
                        >
                          Pay {fmt(balance)}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Work log */}
                  <div>
                    <p className="text-sm font-semibold text-slate-600 mb-2">Work log</p>
                    {(entries[driver.id] || []).length === 0 ? (
                      <p className="text-slate-400 text-sm">No entries</p>
                    ) : (
                      <div className="space-y-1.5">
                        {(entries[driver.id] || []).slice(0, 20).map((e) => (
                          <div
                            key={e.id}
                            className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${
                              e.paymentId ? "bg-white text-slate-400" : "bg-amber-50 text-slate-700"
                            }`}
                          >
                            <span>
                              {e.entryDate} ·{" "}
                              {e.type === "per_ton"
                                ? `${e.tons}t${e.customer ? ` · ${e.customer}` : ""}${e.loadType ? ` · ${e.loadType}` : ""}`
                                : `${e.hours}h`}
                              {e.paymentId && " ✓"}
                            </span>
                            <span className="font-medium">{fmt(e.totalCents)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payment history */}
                  {(payments[driver.id] || []).length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-slate-600 mb-2">Payment history</p>
                      <div className="space-y-1.5">
                        {(payments[driver.id] || []).map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-green-50 text-green-800"
                          >
                            <span>
                              {new Date(p.paidAt).toLocaleDateString()}
                              {p.notes ? ` · ${p.notes}` : ""}
                            </span>
                            <span className="font-bold">{fmt(p.amountCents)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
