"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  activeTrips: number;
  todayExpenses: number;
  todaySpendCents: number;
  totalDrivers: number;
}

interface AIReport {
  report: string;
  stats: {
    totalTrips: number;
    completedTrips: number;
    totalMiles: number;
    totalExpenses: number;
  };
}

export default function OwnerDashboard() {
  const [stats, setStats] = useState<Stats>({ activeTrips: 0, todayExpenses: 0, todaySpendCents: 0, totalDrivers: 0 });
  const [loading, setLoading] = useState(true);
  const [aiReport, setAiReport] = useState<AIReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDays, setReportDays] = useState(30);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/trips?status=active").then((r) => r.json()),
      fetch("/api/expenses?today=true").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([tripsData, expensesData, usersData]) => {
      const todayExpenses = expensesData.expenses || [];
      setStats({
        activeTrips: tripsData.trips?.length || 0,
        todayExpenses: todayExpenses.length,
        todaySpendCents: todayExpenses.reduce((sum: number, e: { amountCents: number }) => sum + e.amountCents, 0),
        totalDrivers: usersData.users?.filter((u: { isActive: boolean }) => u.isActive).length || 0,
      });
      setLoading(false);
    });
  }, []);

  const generateReport = async () => {
    setReportLoading(true);
    setReportOpen(true);
    try {
      const res = await fetch(`/api/ai/report?days=${reportDays}`);
      const data = await res.json();
      setAiReport(data);
    } finally {
      setReportLoading(false);
    }
  };

  const formatDollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm">Active Trips</p>
          <p className="text-3xl font-bold text-green-600">{stats.activeTrips}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm">Active Drivers</p>
          <p className="text-3xl font-bold text-amber-600">{stats.totalDrivers}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm">Today&apos;s Expenses</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.todayExpenses}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm">Today&apos;s Spend</p>
          <p className="text-3xl font-bold text-red-600">{formatDollars(stats.todaySpendCents)}</p>
        </div>
      </div>

      {/* AI Report */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              🤖 AI Business Report
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Natural language summary of your operations</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={reportDays}
              onChange={(e) => setReportDays(Number(e.target.value))}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
            <button
              onClick={generateReport}
              disabled={reportLoading}
              className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium active:bg-violet-700 disabled:opacity-50"
            >
              {reportLoading ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>

        {reportOpen && (
          <div className="border-t border-slate-100 p-4">
            {reportLoading ? (
              <div className="text-center py-6 text-slate-400">
                <div className="text-3xl mb-2 animate-pulse">🤖</div>
                <p>Writing your report...</p>
              </div>
            ) : aiReport ? (
              <div className="space-y-4">
                {aiReport.stats && (
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-slate-800">{aiReport.stats.totalTrips}</p>
                      <p className="text-xs text-slate-500">Trips</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-slate-800">{aiReport.stats.completedTrips}</p>
                      <p className="text-xs text-slate-500">Completed</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-slate-800">{aiReport.stats.totalMiles.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">Miles</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-slate-800">{formatDollars(aiReport.stats.totalExpenses)}</p>
                      <p className="text-xs text-slate-500">Expenses</p>
                    </div>
                  </div>
                )}
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {aiReport.report}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/owner/drivers" className="bg-white rounded-xl p-6 text-center hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm">
          <span className="text-3xl">👤</span>
          <p className="mt-2 font-medium text-slate-800">Manage Drivers</p>
        </Link>
        <Link href="/owner/trips" className="bg-white rounded-xl p-6 text-center hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm">
          <span className="text-3xl">🚛</span>
          <p className="mt-2 font-medium text-slate-800">View Trips</p>
        </Link>
        <Link href="/owner/expenses" className="bg-white rounded-xl p-6 text-center hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm">
          <span className="text-3xl">💰</span>
          <p className="mt-2 font-medium text-slate-800">All Expenses</p>
        </Link>
        <Link href="/owner/reports" className="bg-white rounded-xl p-6 text-center hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm">
          <span className="text-3xl">📋</span>
          <p className="mt-2 font-medium text-slate-800">Audit Reports</p>
        </Link>
        <Link href="/owner/expenses?upload=true" className="bg-amber-600 rounded-xl p-6 text-center hover:bg-amber-700 transition-colors shadow-sm">
          <span className="text-3xl">📷</span>
          <p className="mt-2 font-medium text-white">Upload Receipt</p>
          <p className="text-xs text-amber-100 mt-1">On behalf of a driver</p>
        </Link>
      </div>
    </div>
  );
}
