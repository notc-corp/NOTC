"use client";

import { useEffect, useRef, useState } from "react";

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
const today = () => new Date().toISOString().slice(0, 10);

function parseGrossFormula(input: string): number | null {
  const cleaned = input.trim().replace(/=\s*$/, "");
  if (!cleaned) return null;
  const parts = cleaned.split("+").map((p) => p.trim());
  if (parts.some((p) => p === "" || isNaN(Number(p)))) return null;
  return parts.reduce((sum, p) => sum + Number(p), 0);
}

function deductionsForWeek(deductions: Deduction[], weekStart: string) {
  const items = deductions.filter(
    (d) => d.startWeek <= weekStart && (d.stoppedWeek == null || weekStart < d.stoppedWeek)
  );
  return { items, total: items.reduce((s, d) => s + d.amountCents, 0) };
}

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

function CamBtn({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="absolute right-3 top-3 w-6 h-6 flex items-center justify-center text-slate-400 active:text-amber-600 disabled:opacity-40"
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )}
    </button>
  );
}

export default function DriverLedgerPage() {
  const [feePercent, setFeePercent] = useState(12);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [paidWeeks, setPaidWeeks] = useState<Set<string>>(new Set());
  const [togglingWeek, setTogglingWeek] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ocrLoading, setOcrLoading] = useState<"pump" | "odometer" | null>(null);
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

  const pumpCameraRef = useRef<HTMLInputElement>(null);
  const odometerCameraRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [meRes, entriesRes, weeksRes, deductionsRes] = await Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/ledger/entries").then((r) => r.json()),
      fetch("/api/ledger/weekly-payments").then((r) => r.json()),
      fetch("/api/ledger/deductions").then((r) => r.json()),
    ]);
    setFeePercent(meRes.user?.ledgerFeePercent ?? 12);
    setEntries(entriesRes.entries || []);
    setPaidWeeks(new Set(weeksRes.weeks || []));
    setDeductions(deductionsRes.deductions || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCameraFile = async (file: File, type: "pump" | "odometer") => {
    setOcrLoading(type);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(",");
      const mediaType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
      try {
        const res = await fetch("/api/ledger/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mediaType, type }),
        });
        const data = await res.json();
        if (type === "pump") {
          setForm((f) => ({
            ...f,
            gallons: data.gallons != null ? String(data.gallons) : f.gallons,
            fuelPrice: data.pricePerGallon != null ? String(data.pricePerGallon) : f.fuelPrice,
          }));
        } else {
          setForm((f) => ({ ...f, odometer: data.odometer != null ? String(data.odometer) : f.odometer }));
        }
      } catch {
        // silently fail — user can type manually
      }
      setOcrLoading(null);
    };
    reader.readAsDataURL(file);
  };

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
    setEditingId(null);
  };

  const startEdit = (e: LedgerEntry) => {
    setForm({
      entryDate: e.entryDate,
      odometer: e.odometer != null ? String(e.odometer) : "",
      gallons: e.gallons != null ? String(e.gallons) : "",
      fuelPrice: e.fuelPricePerGallon != null ? String(e.fuelPricePerGallon) : "",
      gross: e.grossCents != null ? String(e.grossCents / 100) : "",
      cashReceived: e.cashReceivedCents != null ? String(e.cashReceivedCents / 100) : "",
      hours: e.workingHours != null ? String(e.workingHours) : "",
      repairCost: e.cashExpenseCents != null ? String(e.cashExpenseCents / 100) : "",
      repairNote: e.cashExpenseNote ?? "",
    });
    setEditingId(e.id);
    setShowForm(true);
  };

  const parsedGross = parseGrossFormula(form.gross);

  const handleSubmit = async () => {
    setSubmitting(true);
    const body: Record<string, string | number> = { entryDate: form.entryDate };
    if (form.odometer) body.odometer = parseFloat(form.odometer);
    if (form.gallons) body.gallons = parseFloat(form.gallons);
    if (form.fuelPrice) body.fuelPricePerGallon = parseFloat(form.fuelPrice);
    if (parsedGross != null) body.grossCents = Math.round(parsedGross * 100);
    if (form.cashReceived) body.cashReceivedCents = Math.round(parseFloat(form.cashReceived) * 100);
    if (form.hours) body.workingHours = parseFloat(form.hours);
    if (form.repairCost) body.cashExpenseCents = Math.round(parseFloat(form.repairCost) * 100);
    if (form.repairNote) body.cashExpenseNote = form.repairNote;

    const res = await fetch(editingId ? `/api/ledger/entries/${editingId}` : "/api/ledger/entries", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      resetForm();
      load();
    }
    setSubmitting(false);
  };

  const exportCSV = () => {
    const headers = ["Date", "Odometer", "Gallons", "MPG", "Fuel $", "Gross $", "Cash recv $", "Net/Payout $", "Hours", "$/hr", "Repair $", "Repair note"];
    const rows = [...entries].reverse().map((e) => [
      e.entryDate,
      e.odometer ?? "",
      e.gallons ?? "",
      e.mpg?.toFixed(1) ?? "",
      e.fuelCostCents != null ? (e.fuelCostCents / 100).toFixed(2) : "",
      e.grossCents != null ? (e.grossCents / 100).toFixed(2) : "",
      e.cashReceivedCents != null ? (e.cashReceivedCents / 100).toFixed(2) : "",
      e.netCents != null ? (e.netCents / 100).toFixed(2) : "",
      e.workingHours ?? "",
      e.moneyPerHour != null ? (e.moneyPerHour / 100).toFixed(2) : "",
      e.cashExpenseCents != null ? (e.cashExpenseCents / 100).toFixed(2) : "",
      e.cashExpenseNote ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewFuelCost =
    form.fuelPrice && form.gallons ? Math.round(parseFloat(form.fuelPrice) * parseFloat(form.gallons) * 100) : null;
  const previewNet =
    form.gross !== "" || previewFuelCost != null || form.cashReceived !== ""
      ? Math.round((parsedGross != null ? parsedGross * 100 : 0) * (1 - feePercent / 100)) -
        (previewFuelCost ?? 0) -
        (form.cashReceived ? Math.round(parseFloat(form.cashReceived) * 100) : 0)
      : null;
  const previewPerHour = previewNet != null && form.hours ? previewNet / parseFloat(form.hours) : null;

  const weeks = groupByWeek(entries);
  // Settlement = gross × (1−fee%) − cash already received − recurring deductions
  const settlementForWeek = (w: WeekGroup) =>
    Math.round(w.gross * (1 - feePercent / 100)) - w.cashReceived - deductionsForWeek(deductions, w.weekStart).total;
  // After fuel = net (already minus fuel) − recurring deductions
  const afterFuelForWeek = (w: WeekGroup) => w.net - deductionsForWeek(deductions, w.weekStart).total;
  // All-time totals (paid + unpaid)
  const settlementTotal = weeks.reduce((sum, w) => sum + settlementForWeek(w), 0);
  const afterFuelTotal = weeks.reduce((sum, w) => sum + afterFuelForWeek(w), 0);
  // Unpaid only — what's still owed
  const settlementOwed = weeks
    .filter((w) => !paidWeeks.has(w.weekStart))
    .reduce((sum, w) => sum + settlementForWeek(w), 0);
  const afterFuelOwed = weeks
    .filter((w) => !paidWeeks.has(w.weekStart))
    .reduce((sum, w) => sum + afterFuelForWeek(w), 0);
  const paidCount = weeks.filter((w) => paidWeeks.has(w.weekStart)).length;

  const thisWeekStart = weekStartOf(today());
  const lastWeekDate = new Date(thisWeekStart + "T00:00:00");
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeekStart = lastWeekDate.toISOString().slice(0, 10);
  const thisWeek = weeks.find((w) => w.weekStart === thisWeekStart);
  const lastWeek = weeks.find((w) => w.weekStart === lastWeekStart);
  const thisWeekDeductions = deductionsForWeek(deductions, thisWeekStart).total;
  const lastWeekDeductions = deductionsForWeek(deductions, lastWeekStart).total;
  const thisWeekSettlement =
    Math.round((thisWeek?.gross ?? 0) * (1 - feePercent / 100)) - (thisWeek?.cashReceived ?? 0) - thisWeekDeductions;
  const thisWeekAfterFuel = (thisWeek?.net ?? 0) - thisWeekDeductions;
  const lastWeekSettlement =
    Math.round((lastWeek?.gross ?? 0) * (1 - feePercent / 100)) - (lastWeek?.cashReceived ?? 0) - lastWeekDeductions;
  const lastWeekAfterFuel = (lastWeek?.net ?? 0) - lastWeekDeductions;

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
      {/* Hidden camera inputs */}
      <input
        ref={pumpCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleCameraFile(f, "pump");
          e.target.value = "";
        }}
      />
      <input
        ref={odometerCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleCameraFile(f, "odometer");
          e.target.value = "";
        }}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">📒 Gross Ledger</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="text-slate-500 px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-white active:bg-slate-50"
          >
            ⬇ CSV
          </button>
          <button
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
            className="bg-amber-600 text-white px-4 py-2 rounded-xl font-medium shadow-sm active:scale-95 active:bg-amber-700 transition-all"
          >
            {showForm ? "Cancel" : "+ Add"}
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 p-5 text-white shadow-md">
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
        <p className="text-amber-100 text-sm font-medium">Общий стейтмент</p>
        <p className="text-4xl font-bold tracking-tight mt-1">{fmt(settlementTotal)}</p>
        <p className="text-amber-100 text-xs mt-1">
          Все {weeks.length} нед · {feePercent}% fee · чистыми {fmt(afterFuelTotal)}
        </p>
        <div className="mt-4 pt-3 border-t border-white/20 grid grid-cols-2 gap-3">
          <div>
            <p className="text-amber-200 text-xs uppercase tracking-wide">К выплате</p>
            <p className="text-2xl font-bold mt-0.5">{fmt(settlementOwed)}</p>
            <p className="text-amber-300 text-xs">
              {weeks.length - paidCount} нед не оплачено
            </p>
          </div>
          <div>
            <p className="text-amber-200 text-xs uppercase tracking-wide">Чистыми</p>
            <p className="text-2xl font-bold mt-0.5">{fmt(afterFuelOwed)}</p>
            <p className="text-amber-300 text-xs">после бензина</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
          <p className="text-xs text-slate-400">This week</p>
          <p className="text-lg font-bold text-slate-800">{fmt(thisWeekSettlement)}</p>
          <p className="text-xs text-slate-400">After fuel {fmt(thisWeekAfterFuel)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
          <p className="text-xs text-slate-400">Last week</p>
          <p className="text-lg font-bold text-slate-800">{fmt(lastWeekSettlement)}</p>
          <p className="text-xs text-slate-400">After fuel {fmt(lastWeekAfterFuel)}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">{editingId ? "Edit entry" : "New entry"}</h2>

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
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="miles"
                  value={form.odometer}
                  onChange={(e) => setForm({ ...form, odometer: e.target.value })}
                  className={fieldInput + " pr-12"}
                />
                <CamBtn loading={ocrLoading === "odometer"} onClick={() => odometerCameraRef.current?.click()} />
              </div>
            </div>
            <div>
              <label className={fieldLabel}>Gallons</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.0"
                  value={form.gallons}
                  onChange={(e) => setForm({ ...form, gallons: e.target.value })}
                  className={fieldInput + " pr-12"}
                />
                <CamBtn loading={ocrLoading === "pump"} onClick={() => pumpCameraRef.current?.click()} />
              </div>
            </div>
          </div>

          <div>
            <label className={fieldLabel}>Fuel price / gallon</label>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                min="0"
                placeholder="0.00"
                value={form.fuelPrice}
                onChange={(e) => setForm({ ...form, fuelPrice: e.target.value })}
                className={fieldInput + " pr-12"}
              />
              <CamBtn loading={ocrLoading === "pump"} onClick={() => pumpCameraRef.current?.click()} />
            </div>
            <p className="text-xs text-slate-400 mt-1">📷 Tap camera icon to scan pump display — fills gallons + price automatically</p>
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
                type="text"
                placeholder="e.g. 150+200+300"
                value={form.gross}
                onChange={(e) => setForm({ ...form, gross: e.target.value })}
                className={fieldInput}
              />
              {form.gross.includes("+") && (
                <p className="text-xs mt-1 text-slate-500">
                  {parsedGross != null ? `= $${parsedGross.toFixed(2)}` : "Can't parse this formula"}
                </p>
              )}
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
            <p className="text-xs text-slate-400 mt-1">Cash you already received — reduces the settlement owed to you</p>
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
            {submitting ? "Saving..." : editingId ? "Save changes" : "Save"}
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
              const weekDeductions = deductionsForWeek(deductions, w.weekStart);
              const weekSettlement = Math.round(w.gross * (1 - feePercent / 100)) - w.cashReceived - weekDeductions.total;
              const weekAfterFuel = w.net - weekDeductions.total;
              return (
                <div key={w.weekStart} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 flex items-start justify-between bg-slate-50 border-b border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-800">{weekRangeLabel(w.weekStart)}</p>
                      <p className="text-xs text-slate-400">Gross {fmt(w.gross)} · {w.hours ? `${w.hours}h` : "—"}</p>
                      {w.cashReceived > 0 && (
                        <p className="text-xs text-blue-500 mt-0.5">💵 Cash received {fmt(w.cashReceived)}</p>
                      )}
                      {weekDeductions.items.length > 0 && (
                        <p className="text-xs text-red-500 mt-0.5">
                          -{fmt(weekDeductions.total)} ({weekDeductions.items.map((d) => d.label).join(", ")})
                        </p>
                      )}
                      <div className="flex gap-4 mt-1.5">
                        <div>
                          <p className="text-xs text-slate-400">Settlement</p>
                          <p className={`font-bold ${weekSettlement < 0 ? "text-red-600" : "text-slate-800"}`}>{fmt(weekSettlement)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">After fuel</p>
                          <p className={`font-bold ${weekAfterFuel < 0 ? "text-red-600" : "text-slate-500"}`}>{fmt(weekAfterFuel)}</p>
                        </div>
                      </div>
                    </div>
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
                  <div className="divide-y divide-slate-100">
                    {w.entries.map((e) => (
                      <div
                        key={e.id}
                        onClick={() => startEdit(e)}
                        className="p-4 cursor-pointer active:bg-slate-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-800">
                            {e.entryDate}
                            {e.editedAt && <span className="text-xs text-slate-400 font-normal ml-2">✏️ edited</span>}
                          </span>
                          {e.netCents != null && (
                            <span className={`font-bold ${e.netCents < 0 ? "text-red-600" : "text-slate-800"}`}>
                              {fmt(e.netCents)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400 mt-1">
                          {e.odometer != null && <span>🛣 {e.odometer.toLocaleString()} mi</span>}
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
