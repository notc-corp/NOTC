"use client";

import { useEffect, useState } from "react";

interface Driver {
  id: number;
  name: string;
  ledgerEnabled: boolean;
  ledgerFeePercent: number;
}

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
  editedAt: string | null;
}

interface Deduction {
  id: number;
  label: string;
  amountCents: number;
  startWeek: string;
  stoppedWeek: string | null;
}

const fmt = (cents: number | null) => (cents == null ? "—" : `$${(cents / 100).toFixed(2)}`);
const num = (n: number | null, digits = 1) => (n == null ? "—" : n.toFixed(digits));

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
  cashReceived: number;
  net: number;
  hours: number;
}

function groupByWeek(entries: LedgerEntry[], feePercent: number): WeekGroup[] {
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
    cashReceived: weekEntries.reduce((s, e) => s + (e.cashReceivedCents ?? 0), 0),
    net: weekEntries.reduce((s, e) => s + (e.netCents ?? 0), 0),
    hours: weekEntries.reduce((s, e) => s + (e.workingHours ?? 0), 0),
    feePercent,
  }));
  return groups.sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
}

function deductionsForWeek(deductions: Deduction[], weekStart: string) {
  const items = deductions.filter(
    (d) => d.startWeek <= weekStart && (d.stoppedWeek == null || weekStart < d.stoppedWeek)
  );
  return { items, total: items.reduce((s, d) => s + d.amountCents, 0) };
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function OwnerLedgerPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [entries, setEntries] = useState<Record<number, LedgerEntry[]>>({});
  const [paidWeeks, setPaidWeeks] = useState<Record<number, Set<string>>>({});
  const [deductions, setDeductions] = useState<Record<number, Deduction[]>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [togglingWeek, setTogglingWeek] = useState<string | null>(null);
  const [stoppingId, setStoppingId] = useState<number | null>(null);
  const [addingDeductionFor, setAddingDeductionFor] = useState<number | null>(null);
  const [deductionForm, setDeductionForm] = useState({ label: "", amount: "" });

  const loadAll = async () => {
    const driversRes = await fetch("/api/users").then((r) => r.json());
    const ledgerDrivers: Driver[] = (driversRes.users || []).filter((d: Driver) => d.ledgerEnabled);
    setDrivers(ledgerDrivers);

    const entriesMap: Record<number, LedgerEntry[]> = {};
    const paidMap: Record<number, Set<string>> = {};
    const deductionsMap: Record<number, Deduction[]> = {};
    await Promise.all(
      ledgerDrivers.map(async (d) => {
        const [entriesRes, weeksRes, deductionsRes] = await Promise.all([
          fetch(`/api/ledger/entries?driverId=${d.id}`).then((r) => r.json()),
          fetch(`/api/ledger/weekly-payments?driverId=${d.id}`).then((r) => r.json()),
          fetch(`/api/ledger/deductions?driverId=${d.id}`).then((r) => r.json()),
        ]);
        entriesMap[d.id] = entriesRes.entries || [];
        paidMap[d.id] = new Set(weeksRes.weeks || []);
        deductionsMap[d.id] = deductionsRes.deductions || [];
      })
    );
    setEntries(entriesMap);
    setPaidWeeks(paidMap);
    setDeductions(deductionsMap);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const toggleWeekPaid = async (driverId: number, weekStart: string, isPaid: boolean) => {
    setTogglingWeek(weekStart);
    if (isPaid) {
      await fetch(`/api/ledger/weekly-payments?driverId=${driverId}&weekStart=${weekStart}`, { method: "DELETE" });
    } else {
      await fetch("/api/ledger/weekly-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId, weekStart }),
      });
    }
    await loadAll();
    setTogglingWeek(null);
  };

  const addDeduction = async (driverId: number) => {
    if (!deductionForm.label || !deductionForm.amount) return;
    await fetch("/api/ledger/deductions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverId,
        label: deductionForm.label,
        amountCents: Math.round(parseFloat(deductionForm.amount) * 100),
        startWeek: weekStartOf(todayStr()),
      }),
    });
    setDeductionForm({ label: "", amount: "" });
    setAddingDeductionFor(null);
    await loadAll();
  };

  const stopDeduction = async (deductionId: number) => {
    setStoppingId(deductionId);
    await fetch(`/api/ledger/deductions/${deductionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stoppedWeek: weekStartOf(todayStr()) }),
    });
    await loadAll();
    setStoppingId(null);
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">📒 Gross Ledger</h1>

      {drivers.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          No drivers have Gross Ledger enabled. Turn it on in Drivers → Edit.
        </p>
      ) : (
        <div className="space-y-3">
          {drivers.map((driver) => {
            const rows = entries[driver.id] || [];
            const driverPaidWeeks = paidWeeks[driver.id] || new Set<string>();
            const driverDeductions = deductions[driver.id] || [];
            const weeks = groupByWeek(rows, driver.ledgerFeePercent);
            const totals = rows.reduce(
              (acc, r) => ({
                gross: acc.gross + (r.grossCents ?? 0),
                fuel: acc.fuel + (r.fuelCostCents ?? 0),
                cashReceived: acc.cashReceived + (r.cashReceivedCents ?? 0),
                repairExpense: acc.repairExpense + (r.cashExpenseCents ?? 0),
                hours: acc.hours + (r.workingHours ?? 0),
              }),
              { gross: 0, fuel: 0, cashReceived: 0, repairExpense: 0, hours: 0 }
            );
            const settlementForWeek = (w: WeekGroup) =>
              Math.round(w.gross * (1 - driver.ledgerFeePercent / 100)) - w.cashReceived - deductionsForWeek(driverDeductions, w.weekStart).total;
            const afterFuelForWeek = (w: WeekGroup) => w.net - deductionsForWeek(driverDeductions, w.weekStart).total;
            const settlementTotal = weeks.reduce((sum, w) => sum + settlementForWeek(w), 0);
            const afterFuelTotal = weeks.reduce((sum, w) => sum + afterFuelForWeek(w), 0);
            const settlementOwed = weeks
              .filter((w) => !driverPaidWeeks.has(w.weekStart))
              .reduce((sum, w) => sum + settlementForWeek(w), 0);
            const afterFuelOwed = weeks
              .filter((w) => !driverPaidWeeks.has(w.weekStart))
              .reduce((sum, w) => sum + afterFuelForWeek(w), 0);
            const paidCount = weeks.filter((w) => driverPaidWeeks.has(w.weekStart)).length;
            const isSelected = selected === driver.id;
            const activeDeductions = driverDeductions.filter((d) => !d.stoppedWeek);
            const stoppedDeductions = driverDeductions.filter((d) => d.stoppedWeek);

            return (
              <div key={driver.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div
                  className="p-4 cursor-pointer active:bg-slate-50 flex items-center justify-between"
                  onClick={() => setSelected(isSelected ? null : driver.id)}
                >
                  <div>
                    <p className="font-semibold text-slate-800">{driver.name}</p>
                    <p className="text-sm text-slate-500">
                      Dispatch fee {driver.ledgerFeePercent}% · {rows.length} entries
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Всего</p>
                      <p className="font-bold text-lg text-slate-700">{fmt(settlementTotal)}</p>
                      <p className="text-xs text-slate-400">
                        к выплате{" "}
                        <span className={settlementOwed >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                          {fmt(settlementOwed)}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">чистыми {fmt(afterFuelOwed)}</p>
                    </div>
                    <span className="text-slate-400 text-xl">{isSelected ? "▲" : "▼"}</span>
                  </div>
                </div>

                {isSelected && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3">
                    <p className="text-xs text-slate-400">
                      Общий стейтмент {fmt(settlementTotal)} (все {weeks.length} нед) · чистыми всего {fmt(afterFuelTotal)} · к выплате {fmt(settlementOwed)} ({weeks.length - paidCount} нед)
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white rounded-lg p-2 border border-slate-200">
                        <p className="text-xs text-slate-400">Gross</p>
                        <p className="font-semibold text-slate-800">{fmt(totals.gross)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-slate-200">
                        <p className="text-xs text-slate-400">Fuel</p>
                        <p className="font-semibold text-slate-800">{fmt(totals.fuel)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-slate-200">
                        <p className="text-xs text-slate-400">Hours</p>
                        <p className="font-semibold text-slate-800">{num(totals.hours)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-slate-200">
                        <p className="text-xs text-slate-400">Cash received</p>
                        <p className="font-semibold text-slate-800">{fmt(totals.cashReceived)}</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-2 border border-amber-200 col-span-2">
                        <p className="text-xs text-amber-600">Repair/maintenance (own pocket)</p>
                        <p className="font-semibold text-amber-700">{fmt(totals.repairExpense)}</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-700">Recurring deductions</p>
                        <button
                          onClick={() => setAddingDeductionFor(addingDeductionFor === driver.id ? null : driver.id)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 active:bg-slate-200 shrink-0"
                        >
                          + Add deduction
                        </button>
                      </div>

                      {activeDeductions.length === 0 && stoppedDeductions.length === 0 && (
                        <p className="text-xs text-slate-400">None set up.</p>
                      )}

                      {activeDeductions.map((d) => (
                        <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="text-slate-700 min-w-0">{d.label} · since {d.startWeek}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-semibold text-red-600 whitespace-nowrap">-{fmt(d.amountCents)}/wk</span>
                            <button
                              onClick={() => stopDeduction(d.id)}
                              disabled={stoppingId === d.id}
                              className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 active:bg-red-100 disabled:opacity-50 shrink-0"
                            >
                              {stoppingId === d.id ? "..." : "Stop"}
                            </button>
                          </div>
                        </div>
                      ))}

                      {stoppedDeductions.length > 0 && (
                        <div className="pt-1 border-t border-slate-100 space-y-1">
                          {stoppedDeductions.map((d) => (
                            <p key={d.id} className="text-xs text-slate-400">
                              {d.label} -{fmt(d.amountCents)}/wk · {d.startWeek} → stopped {d.stoppedWeek}
                            </p>
                          ))}
                        </div>
                      )}

                      {addingDeductionFor === driver.id && (
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Label (e.g. Escrow)"
                              value={deductionForm.label}
                              onChange={(e) => setDeductionForm({ ...deductionForm, label: e.target.value })}
                              className="flex-1 min-w-0 h-9 rounded-lg border border-slate-300 px-2 text-sm"
                            />
                            <input
                              type="number"
                              step="0.01"
                              placeholder="$/wk"
                              value={deductionForm.amount}
                              onChange={(e) => setDeductionForm({ ...deductionForm, amount: e.target.value })}
                              className="w-20 h-9 rounded-lg border border-slate-300 px-2 text-sm"
                            />
                          </div>
                          <button
                            onClick={() => addDeduction(driver.id)}
                            className="w-full h-9 rounded-lg bg-amber-600 text-white text-sm font-medium active:bg-amber-700"
                          >
                            Add
                          </button>
                        </div>
                      )}
                    </div>

                    {weeks.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-4">No entries yet</p>
                    ) : (
                      <div className="space-y-3">
                        {weeks.map((w) => {
                          const isPaid = driverPaidWeeks.has(w.weekStart);
                          const weekDeductions = deductionsForWeek(driverDeductions, w.weekStart);
                          const weekSettlement = Math.round(w.gross * (1 - driver.ledgerFeePercent / 100)) - w.cashReceived - weekDeductions.total;
                          const weekAfterFuel = w.net - weekDeductions.total;
                          return (
                            <div key={w.weekStart} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                              <div className="px-3 py-2 flex items-start justify-between bg-slate-100 border-b border-slate-200">
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">{weekRangeLabel(w.weekStart)}</p>
                                  <p className="text-xs text-slate-400">Gross {fmt(w.gross)} · {num(w.hours)}h</p>
                                  {weekDeductions.items.length > 0 && (
                                    <p className="text-xs text-red-500">-{fmt(weekDeductions.total)} deductions</p>
                                  )}
                                  <div className="flex gap-3 mt-1">
                                    <div>
                                      <p className="text-xs text-slate-400">Settlement</p>
                                      <p className={`text-sm font-bold ${weekSettlement < 0 ? "text-red-600" : "text-slate-800"}`}>{fmt(weekSettlement)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400">After fuel</p>
                                      <p className={`text-sm font-bold ${weekAfterFuel < 0 ? "text-red-600" : "text-slate-500"}`}>{fmt(weekAfterFuel)}</p>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => toggleWeekPaid(driver.id, w.weekStart, isPaid)}
                                  disabled={togglingWeek === w.weekStart}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap disabled:opacity-50 ${
                                    isPaid ? "bg-green-100 text-green-700 border border-green-300" : "bg-amber-600 text-white active:bg-amber-700"
                                  }`}
                                >
                                  {togglingWeek === w.weekStart ? "..." : isPaid ? "✅ Paid" : "Mark Paid"}
                                </button>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-slate-500 border-b border-slate-200">
                                      <th className="text-left py-1.5 pr-2 pl-3">Date</th>
                                      <th className="text-right py-1.5 pr-2">Odo</th>
                                      <th className="text-right py-1.5 pr-2">Gal</th>
                                      <th className="text-right py-1.5 pr-2">MPG</th>
                                      <th className="text-right py-1.5 pr-2">Gross</th>
                                      <th className="text-right py-1.5 pr-2">Cash recv</th>
                                      <th className="text-right py-1.5 pr-2">Payout</th>
                                      <th className="text-right py-1.5 pr-2">Hrs</th>
                                      <th className="text-right py-1.5 pr-2">$/hr</th>
                                      <th className="text-right py-1.5 pr-3">Repair</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {w.entries.map((r) => (
                                      <tr key={r.id} className="border-b border-slate-100">
                                        <td className="py-1.5 pr-2 pl-3 whitespace-nowrap">{r.entryDate}</td>
                                        <td className="text-right py-1.5 pr-2">{r.odometer ?? "—"}</td>
                                        <td className="text-right py-1.5 pr-2">{num(r.gallons)}</td>
                                        <td className="text-right py-1.5 pr-2">{num(r.mpg)}</td>
                                        <td className="text-right py-1.5 pr-2">{fmt(r.grossCents)}</td>
                                        <td className="text-right py-1.5 pr-2">{fmt(r.cashReceivedCents)}</td>
                                        <td className={`text-right py-1.5 pr-2 font-medium ${r.netCents != null && r.netCents < 0 ? "text-red-600" : ""}`}>
                                          {fmt(r.netCents)}
                                        </td>
                                        <td className="text-right py-1.5 pr-2">{num(r.workingHours)}</td>
                                        <td className="text-right py-1.5 pr-2">{fmt(r.moneyPerHour != null ? Math.round(r.moneyPerHour) : null)}</td>
                                        <td className="text-right py-1.5 pr-3 text-amber-600">
                                          {r.cashExpenseCents ? `${fmt(r.cashExpenseCents)}${r.cashExpenseNote ? ` (${r.cashExpenseNote})` : ""}` : "—"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
