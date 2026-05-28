"use client";

import { useState, useEffect, useCallback } from "react";

interface TruckRow {
  truckNumber: string;
  trips: number;
  miles: number;
  fuel: number;
  tolls: number;
  maintenance: number;
  food: number;
  other: number;
  totalCents: number;
  costPerMile: number;
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function toDateInput(date: Date) {
  return date.toISOString().split("T")[0];
}

export default function TruckAccountingPage() {
  const today = toDateInput(new Date());
  const defaultFrom = toDateInput(new Date(Date.now() - 30 * 86400000));

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<TruckRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/trucks/accounting?from=${from}&to=${to}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.rows);
    }
    setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    const headers = ["Truck", "Trips", "Miles", "Fuel", "Tolls", "Maintenance", "Food", "Other", "Total", "$/Mile"];
    const csvRows = rows.map((r) => [
      r.truckNumber,
      r.trips,
      r.miles,
      (r.fuel / 100).toFixed(2),
      (r.tolls / 100).toFixed(2),
      (r.maintenance / 100).toFixed(2),
      (r.food / 100).toFixed(2),
      (r.other / 100).toFixed(2),
      (r.totalCents / 100).toFixed(2),
      (r.costPerMile / 100).toFixed(3),
    ]);

    const csv = [headers, ...csvRows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `truck-accounting-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = rows.reduce(
    (acc, r) => ({
      trips: acc.trips + r.trips,
      miles: acc.miles + r.miles,
      fuel: acc.fuel + r.fuel,
      tolls: acc.tolls + r.tolls,
      maintenance: acc.maintenance + r.maintenance,
      food: acc.food + r.food,
      other: acc.other + r.other,
      totalCents: acc.totalCents + r.totalCents,
    }),
    { trips: 0, miles: 0, fuel: 0, tolls: 0, maintenance: 0, food: 0, other: 0, totalCents: 0 }
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Truck Accounting</h1>
        <button
          onClick={exportCSV}
          disabled={rows.length === 0}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      {/* Date filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex gap-4 flex-wrap items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">From</label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">To</label>
          <input
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => setTo(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={load}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700"
        >
          Apply
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500 text-sm">No data for selected period.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Truck", "Trips", "Miles", "Fuel", "Tolls", "Maint.", "Food", "Other", "Total", "$/Mile"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.truckNumber} className="hover:bg-amber-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{row.truckNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{row.trips}</td>
                  <td className="px-4 py-3 text-slate-600">{row.miles.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700">{fmt(row.fuel)}</td>
                  <td className="px-4 py-3 text-slate-700">{fmt(row.tolls)}</td>
                  <td className="px-4 py-3 text-slate-700">{fmt(row.maintenance)}</td>
                  <td className="px-4 py-3 text-slate-700">{fmt(row.food)}</td>
                  <td className="px-4 py-3 text-slate-700">{fmt(row.other)}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{fmt(row.totalCents)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {row.miles > 0 ? `$${(row.costPerMile / 100).toFixed(3)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-300">
              <tr>
                <td className="px-4 py-3 font-bold">TOTAL</td>
                <td className="px-4 py-3 font-bold">{totals.trips}</td>
                <td className="px-4 py-3 font-bold">{totals.miles.toLocaleString()}</td>
                <td className="px-4 py-3 font-bold">{fmt(totals.fuel)}</td>
                <td className="px-4 py-3 font-bold">{fmt(totals.tolls)}</td>
                <td className="px-4 py-3 font-bold">{fmt(totals.maintenance)}</td>
                <td className="px-4 py-3 font-bold">{fmt(totals.food)}</td>
                <td className="px-4 py-3 font-bold">{fmt(totals.other)}</td>
                <td className="px-4 py-3 font-bold text-amber-700">{fmt(totals.totalCents)}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {totals.miles > 0
                    ? `$${((totals.totalCents / totals.miles) / 100).toFixed(3)}`
                    : "—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
