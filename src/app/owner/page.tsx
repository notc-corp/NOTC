"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  activeTrips: number;
  todayExpenses: number;
  todaySpendCents: number;
  totalDrivers: number;
}

export default function OwnerDashboard() {
  const [stats, setStats] = useState<Stats>({
    activeTrips: 0,
    todayExpenses: 0,
    todaySpendCents: 0,
    totalDrivers: 0,
  });
  const [loading, setLoading] = useState(true);

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
        todaySpendCents: todayExpenses.reduce(
          (sum: number, e: { amountCents: number }) => sum + e.amountCents,
          0
        ),
        totalDrivers: usersData.users?.filter(
          (u: { isActive: boolean }) => u.isActive
        ).length || 0,
      });
      setLoading(false);
    });
  }, []);

  const formatDollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm">Active Trips</p>
          <p className="text-3xl font-bold text-green-600">
            {stats.activeTrips}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm">Active Drivers</p>
          <p className="text-3xl font-bold text-amber-600">
            {stats.totalDrivers}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm">Today&apos;s Expenses</p>
          <p className="text-3xl font-bold text-yellow-600">
            {stats.todayExpenses}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm">Today&apos;s Spend</p>
          <p className="text-3xl font-bold text-red-600">
            {formatDollars(stats.todaySpendCents)}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/owner/drivers"
          className="bg-white rounded-xl p-6 text-center hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm"
        >
          <span className="text-3xl">👤</span>
          <p className="mt-2 font-medium text-slate-800">Manage Drivers</p>
        </Link>
        <Link
          href="/owner/trips"
          className="bg-white rounded-xl p-6 text-center hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm"
        >
          <span className="text-3xl">🚛</span>
          <p className="mt-2 font-medium text-slate-800">View Trips</p>
        </Link>
        <Link
          href="/owner/expenses"
          className="bg-white rounded-xl p-6 text-center hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm"
        >
          <span className="text-3xl">💰</span>
          <p className="mt-2 font-medium text-slate-800">All Expenses</p>
        </Link>
        <Link
          href="/owner/reports"
          className="bg-white rounded-xl p-6 text-center hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm"
        >
          <span className="text-3xl">📋</span>
          <p className="mt-2 font-medium text-slate-800">Audit Reports</p>
        </Link>
        <Link
          href="/owner/expenses?upload=true"
          className="bg-amber-600 rounded-xl p-6 text-center hover:bg-amber-700 transition-colors shadow-sm"
        >
          <span className="text-3xl">📷</span>
          <p className="mt-2 font-medium text-white">Upload Receipt</p>
          <p className="text-xs text-amber-100 mt-1">On behalf of a driver</p>
        </Link>
      </div>
    </div>
  );
}
