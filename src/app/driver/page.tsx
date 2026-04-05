"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Trip {
  id: number;
  status: string;
  startOdometer: number | null;
  endOdometer: number | null;
  startedAt: string;
}

interface Expense {
  id: number;
  category: string;
  amountCents: number;
  description: string | null;
  createdAt: string;
}

export default function DriverDashboard() {
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [todayExpenses, setTodayExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    Promise.all([
      fetch("/api/trips?status=active").then((r) => r.json()),
      fetch("/api/expenses?today=true").then((r) => r.json()),
    ]).then(([tripsData, expensesData]) => {
      setActiveTrip(tripsData.trips?.[0] || null);
      setTodayExpenses(expensesData.expenses || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDollars = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const categoryIcons: Record<string, string> = {
    fuel: "⛽",
    tolls: "🛣️",
    maintenance: "🔧",
    food: "🍔",
    other: "📋",
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Trip Status */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        {activeTrip ? (
          <>
            <div className="text-center mb-4">
              <span className="inline-block bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                Trip Active
              </span>
            </div>
            <p className="text-center text-slate-600 mb-1">
              Started: {new Date(activeTrip.startedAt).toLocaleTimeString()}
            </p>
            {activeTrip.startOdometer && (
              <p className="text-center text-slate-500 text-sm">
                Start mileage: {activeTrip.startOdometer.toLocaleString()} mi
              </p>
            )}
            <Link
              href="/driver/photo?action=end"
              className="block w-full mt-4 h-16 rounded-xl bg-red-600 text-white text-xl font-bold active:bg-red-700 transition-colors text-center leading-[4rem]"
            >
              End Trip
            </Link>
          </>
        ) : (
          <Link
            href="/driver/photo?action=start"
            className="block w-full h-20 rounded-xl bg-green-600 text-white text-2xl font-bold active:bg-green-700 transition-colors text-center leading-[5rem]"
          >
            Start Trip
          </Link>
        )}
      </div>

      {/* Add Receipt Button */}
      {activeTrip && (
        <Link
          href="/driver/receipt"
          className="block w-full h-16 rounded-xl bg-amber-600 text-white text-xl font-bold active:bg-amber-700 transition-colors text-center leading-[4rem]"
        >
          ⛽ Add Receipt
        </Link>
      )}

      {/* Today's Expenses */}
      <div>
        <h2 className="text-lg font-semibold text-slate-600 mb-3">
          Today&apos;s Expenses
        </h2>
        {todayExpenses.length === 0 ? (
          <p className="text-slate-500 text-center py-4">
            No expenses yet today
          </p>
        ) : (
          <div className="space-y-2">
            {todayExpenses.map((exp) => (
              <div
                key={exp.id}
                className="bg-white rounded-xl p-4 flex items-center justify-between border border-slate-200 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {categoryIcons[exp.category] || "📋"}
                  </span>
                  <div>
                    <p className="font-medium text-slate-800 capitalize">{exp.category}</p>
                    {exp.description && (
                      <p className="text-sm text-slate-500">
                        {exp.description}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-lg font-bold text-slate-800">
                  {formatDollars(exp.amountCents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
