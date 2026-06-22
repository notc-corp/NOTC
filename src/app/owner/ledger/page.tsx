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
}

const fmt = (cents: number | null) => (cents == null ? "—" : `$${(cents / 100).toFixed(2)}`);
const num = (n: number | null, digits = 1) => (n == null ? "—" : n.toFixed(digits));

export default function OwnerLedgerPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [entries, setEntries] = useState<Record<number, LedgerEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  const loadAll = async () => {
    const driversRes = await fetch("/api/users").then((r) => r.json());
    const ledgerDrivers: Driver[] = (driversRes.users || []).filter((d: Driver) => d.ledgerEnabled);
    setDrivers(ledgerDrivers);

    const entriesMap: Record<number, LedgerEntry[]> = {};
    await Promise.all(
      ledgerDrivers.map(async (d) => {
        const res = await fetch(`/api/ledger/entries?driverId=${d.id}`).then((r) => r.json());
        entriesMap[d.id] = res.entries || [];
      })
    );
    setEntries(entriesMap);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

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
            const totals = rows.reduce(
              (acc, r) => ({
                gross: acc.gross + (r.grossCents ?? 0),
                fuel: acc.fuel + (r.fuelCostCents ?? 0),
                cashReceived: acc.cashReceived + (r.cashReceivedCents ?? 0),
                repairExpense: acc.repairExpense + (r.cashExpenseCents ?? 0),
                payoutOwed: acc.payoutOwed + (r.netCents ?? 0),
                hours: acc.hours + (r.workingHours ?? 0),
              }),
              { gross: 0, fuel: 0, cashReceived: 0, repairExpense: 0, payoutOwed: 0, hours: 0 }
            );
            const isSelected = selected === driver.id;

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
                      <p className="text-xs text-slate-400">Payout owed</p>
                      <p className={`font-bold text-lg ${totals.payoutOwed >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {fmt(totals.payoutOwed)}
                      </p>
                    </div>
                    <span className="text-slate-400 text-xl">{isSelected ? "▲" : "▼"}</span>
                  </div>
                </div>

                {isSelected && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3">
                    <p className="text-xs text-slate-400">
                      Payout owed = GROSS × (1 − fee%) − fuel − cash already received. Repair expenses are tracked separately and don&apos;t affect payout.
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

                    {rows.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-4">No entries yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-200">
                              <th className="text-left py-1.5 pr-2">Date</th>
                              <th className="text-right py-1.5 pr-2">Odo</th>
                              <th className="text-right py-1.5 pr-2">Gal</th>
                              <th className="text-right py-1.5 pr-2">MPG</th>
                              <th className="text-right py-1.5 pr-2">Gross</th>
                              <th className="text-right py-1.5 pr-2">Cash recv</th>
                              <th className="text-right py-1.5 pr-2">Payout</th>
                              <th className="text-right py-1.5 pr-2">Hrs</th>
                              <th className="text-right py-1.5 pr-2">$/hr</th>
                              <th className="text-right py-1.5">Repair</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r) => (
                              <tr key={r.id} className="border-b border-slate-100">
                                <td className="py-1.5 pr-2 whitespace-nowrap">{r.entryDate}</td>
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
                                <td className="text-right py-1.5 text-amber-600">
                                  {r.cashExpenseCents ? `${fmt(r.cashExpenseCents)}${r.cashExpenseNote ? ` (${r.cashExpenseNote})` : ""}` : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
