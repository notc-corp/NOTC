"use client";

import { useEffect, useState } from "react";

interface LedgerEntry {
  id: number;
  entryDate: string;
  odometer: number | null;
  gallons: number | null;
  fuelPricePerGallon: number | null;
  fuelCostCents: number | null;
  grossCents: number | null;
  workingHours: number | null;
  cashReceivedCents: number | null;
  cashExpenseCents: number | null;
  cashExpenseNote: string | null;
  milesForDay: number | null;
  mpg: number | null;
  netCents: number | null;
  moneyPerHour: number | null;
}

const fmt = (cents: number | null) => (cents == null ? "—" : `$${(cents / 100).toFixed(2)}`);
const today = () => new Date().toISOString().slice(0, 10);

// Weeks run Sunday–Saturday.
const weekStartOf = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
};
const weekRangeLabel = (weekStart: string) => {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const f = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${f(start)} – ${f(end)}`;
};

interface WeekGroup {
  weekStart: string;
  entries: LedgerEntry[];
  gross: number;
  fuel: number;
  cashReceived: number;
  repairExpense: number;
  hours: number;
  net: number;
}

function groupByWeek(entries: LedgerEntry[]): WeekGroup[] {
  const map = new Map<string, LedgerEntry[]>();
  for (const e of entries) {
    const ws = weekStartOf(e.entryDate);
    if (!map.has(ws)) map.set(ws, []);
    map.get(ws)!.push(e);
  }
  const groups: WeekGroup[] = Array.from(map.entries()).map(([weekStart, weekEntries]) => ({
    weekStart,
    entries: weekEntries,
    gross: weekEntries.reduce((s, e) => s + (e.grossCents ?? 0), 0),
    fuel: weekEntries.reduce((s, e) => s + (e.fuelCostCents ?? 0), 0),
    cashReceived: weekEntries.reduce((s, e) => s + (e.cashReceivedCents ?? 0), 0),
    repairExpense: weekEntries.reduce((s, e) => s + (e.cashExpenseCents ?? 0), 0),
    hours: weekEntries.reduce((s, e) => s + (e.workingHours ?? 0), 0),
    net: weekEntries.reduce((s, e) => s + (e.netCents ?? 0), 0),
  }));
  return groups.sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
}

const fieldLabel = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";
const fieldInput =
  "w-full h-12 rounded-xl bg-white px-4 text-slate-800 border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 focus:outline-none transition-colors";

export default function DriverLedgerPage() {
  const [feePercent, setFeePercent] = useState(12);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [paidWeeks, setPaidWeeks] = useState<Set<string>>(new Set());
  const [togglingWeek, setTogglingWeek] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    entryDate: today(),
    odometer: "",
    gallons: "",
    fuelPrice: "",
    gross: "",
    cashReceived: "",
    hours: "",
    repairCost: "",
    repairNote: "",
  });

  const load = async () => {
    const [meRes, entriesRes, weeksRes] = await Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/ledger/entries").then((r) => r.json()),
      fetch("/api/ledger/weekly-payments").then((r) => r.json()),
    ]);
    setFeePercent(meRes.user?.ledgerFeePercent ?? 12);
    setEntries(entriesRes.entries || []);
    setPaidWeeks(new Set(weeksRes.weeks || []));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleWeekPaid = async (weekStart: string, isPaid: boolean) => {
    setTogglingWeek(weekStart);
    if (isPaid) {
      await fetch(`/api/ledger/weekly-payments?weekStart=${weekStart}`, { method: "DELETE" });
    } else {
      await fetch("/api/ledger/weekly-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart }),
      });
    }
    await load();
    setTogglingWeek(null);
  };

  const resetForm = () => {
    setForm({ entryDate: today(), odometer: "", gallons: "", fuelPrice: "", gross: "", cashReceived: "", hours: "", repairCost: "", repairNote: "" });
    setShowForm(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const body: Record<string, string | number> = { entryDate: form.entryDate };
    if (form.odometer) body.odometer = parseFloat(form.odometer);
    if (form.gallons) body.gallons = parseFloat(form.gallons);
    if (form.fuelPrice) body.fuelPricePerGallon = parseFloat(form.fuelPrice);
    if (form.gross) body.grossCents = Math.round(parseFloat(form.gross) * 100);
    if (form.cashReceived) body.cashReceivedCents = Math.round(parseFloat(form.cashReceived) * 100);
    if (form.hours) body.workingHours = parseFloat(form.hours);
    if (form.repairCost) body.cashExpenseCents = Math.round(parseFloat(form.repairCost) * 100);
    if (form.repairNote) body.cashExpenseNote = form.repairNote;

    const res = await fetch("/api/ledger/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      resetForm();
      load();
    }
    setSubmitting(false);
  };

  const previewFuelCost =
    form.fuelPrice && form.gallons ? Math.round(parseFloat(form.fuelPrice) * parseFloat(form.gallons) * 100) : null;
  const previewNet =
    form.gross !== "" || previewFuelCost != null || form.cashReceived !== ""
      ? Math.round((form.gross ? parseFloat(form.gross) * 100 : 0) * (1 - feePercent / 100)) -
        (previewFuelCost ?? 0) -
        (form.cashReceived ? Math.round(parseFloat(form.cashReceived) * 100) : 0)
      : null;
  const previewPerHour = previewNet != null && form.hours ? previewNet / parseFloat(form.hours) : null;

  const weeks = groupByWeek(entries);
  const payoutOwed = weeks
    .filter((w) => !paidWeeks.has(w.weekStart))
    .reduce((sum, w) => sum + w.net, 0);

  const thisWeekStart = weekStartOf(today());
  const lastWeekDate = new Date(thisWeekStart + "T00:00:00");
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeekStart = lastWeekDate.toISOString().slice(0, 10);
  const thisWeek = weeks.find((w) => w.weekStart === thisWeekStart);
  const lastWeek = weeks.find((w) => w.weekStart === lastWeekStart);

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 w-40 bg-slate-200 rounded-lg" />
        <div className="h-28 bg-slate-200 rounded-2xl" />
        <div className="h-16 bg-slate-200 rounded-xl" />
        <div className="h-16 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">📒 Gross Ledger</h1>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="bg-amber-600 text-white px-4 py-2 rounded-xl font-medium shadow-sm active:scale-95 active:bg-amber-700 transition-all"
        >
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 p-5 text-white shadow-md">
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
        <p className="text-amber-100 text-sm font-medium">Payout owed (all time)</p>
        <p className="text-4xl font-bold tracking-tight mt-1">{fmt(payoutOwed)}</p>
        <p className="text-amber-100 text-xs mt-2">After {feePercent}% dispatch fee, fuel & cash received</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
          <p className="text-xs text-slate-400">This week</p>
          <p className="text-lg font-bold text-slate-800">{fmt(thisWeek?.net ?? 0)}</p>
          <p className="text-xs text-slate-400">Gross {fmt(thisWeek?.gross ?? 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
          <p className="text-xs text-slate-400">Last week</p>
          <p className="text-lg font-bold text-slate-800">{fmt(lastWeek?.net ?? 0)}</p>
          <p className="text-xs text-slate-400">Gross {fmt(lastWeek?.gross ?? 0)}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">New entry</h2>

          <div>
            <label className={fieldLabel}>Date</label>
            <input
              type="date"
              value={form.entryDate}
              onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
              className={fieldInput}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={fieldLabel}>Odometer</label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="miles"
                value={form.odometer}
                onChange={(e) => setForm({ ...form, odometer: e.target.value })}
                className={fieldInput}
              />
            </div>
            <div>
              <label className={fieldLabel}>Gallons</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.0"
                value={form.gallons}
                onChange={(e) => setForm({ ...form, gallons: e.target.value })}
                className={fieldInput}
              />
            </div>
          </div>

          <div>
            <label className={fieldLabel}>Fuel price / gallon</label>
            <input
              type="number"
              step="0.001"
              min="0"
              placeholder="0.00"
              value={form.fuelPrice}
              onChange={(e) => setForm({ ...form, fuelPrice: e.target.value })}
              className={fieldInput}
            />
          </div>

          {previewFuelCost != null && (
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm">
              <span className="text-slate-500">Fuel cost</span>
              <span className="font-semibold text-slate-700">{fmt(previewFuelCost)}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={fieldLabel}>Gross (load)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Optional"
                value={form.gross}
                onChange={(e) => setForm({ ...form, gross: e.target.value })}
                className={fieldInput}
              />
            </div>
            <div>
              <label className={fieldLabel}>Hours worked</label>
              <input
                type="number"
                step="0.25"
                min="0"
                placeholder="Optional"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                className={fieldInput}
              />
            </div>
          </div>

          <div>
            <label className={fieldLabel}>Cash received from this load</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Optional — part of gross paid to you in cash"
              value={form.cashReceived}
              onChange={(e) => setForm({ ...form, cashReceived: e.target.value })}
              className={fieldInput}
            />
          </div>

          {previewNet != null && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <span className="text-green-700 text-sm font-medium">
                Payout owed{previewPerHour != null ? ` · $${(previewPerHour / 100).toFixed(2)}/hr` : ""}
              </span>
              <span className="text-green-700 font-bold text-lg">{fmt(Math.round(previewNet))}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className={fieldLabel}>Repair / maintenance</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Own pocket, optional"
                value={form.repairCost}
                onChange={(e) => setForm({ ...form, repairCost: e.target.value })}
                className={fieldInput}
              />
            </div>
            <div>
              <label className={fieldLabel}>What for</label>
              <input
                type="text"
                placeholder="e.g. tires, ТО"
                value={form.repairNote}
                onChange={(e) => setForm({ ...form, repairNote: e.target.value })}
                className={fieldInput}
              />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Repair costs are tracked separately for your records — they don&apos;t reduce the payout above.
          </p>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-green-600 text-white font-bold shadow-sm disabled:opacity-40 active:scale-[0.98] active:bg-green-700 transition-all"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">By week</h2>
        {weeks.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-3xl mb-2">📒</p>
            <p className="text-slate-400 text-sm">No entries yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {weeks.map((w) => {
              const isPaid = paidWeeks.has(w.weekStart);
              return (
                <div key={w.weekStart} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 flex items-center justify-between bg-slate-50 border-b border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-800">{weekRangeLabel(w.weekStart)}</p>
                      <p className="text-xs text-slate-400">Gross {fmt(w.gross)} · {w.hours ? `${w.hours}h` : "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${w.net < 0 ? "text-red-600" : "text-slate-800"}`}>{fmt(w.net)}</span>
                      <button
                        onClick={() => toggleWeekPaid(w.weekStart, isPaid)}
                        disabled={togglingWeek === w.weekStart}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap disabled:opacity-50 ${
                          isPaid ? "bg-green-100 text-green-700 border border-green-300" : "bg-amber-600 text-white active:bg-amber-700"
                        }`}
                      >
                        {togglingWeek === w.weekStart ? "..." : isPaid ? "✅ Paid" : "Mark Paid"}
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {w.entries.map((e) => (
                      <div key={e.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-800">{e.entryDate}</span>
                          {e.netCents != null && (
                            <span className={`font-bold ${e.netCents < 0 ? "text-red-600" : "text-slate-800"}`}>
                              {fmt(e.netCents)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400 mt-1">
                          {e.gallons != null && <span>⛽ {e.gallons}gal{e.mpg != null ? ` · ${e.mpg.toFixed(1)} mpg` : ""}</span>}
                          {e.grossCents != null && <span>GROSS {fmt(e.grossCents)}</span>}
                          {e.workingHours != null && (
                            <span>{e.workingHours}h{e.moneyPerHour != null ? ` · $${(e.moneyPerHour / 100).toFixed(2)}/hr` : ""}</span>
                          )}
                          {e.cashReceivedCents != null && <span>💵 received {fmt(e.cashReceivedCents)}</span>}
                          {e.cashExpenseCents != null && (
                            <span className="text-amber-600">🔧 {fmt(e.cashExpenseCents)}{e.cashExpenseNote ? ` ${e.cashExpenseNote}` : ""}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
