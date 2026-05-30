"use client";

import { useEffect, useState, useRef } from "react";
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
  receiptPath: string | null;
  createdAt: string;
}

const GPS_INTERVAL_MS = 30_000;

export default function DriverDashboard() {
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [todayExpenses, setTodayExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"off" | "active" | "error">("off");
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

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

  const sendLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, speed, heading, accuracy } = pos.coords;
        const mph = speed != null ? speed * 2.237 : null;
        setCurrentSpeed(mph != null ? Math.round(mph) : null);
        setGpsStatus("active");
        fetch("/api/trips/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: latitude, lng: longitude, speed: mph, heading, accuracy }),
        }).catch(() => {});
      },
      () => setGpsStatus("error"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const acquireWakeLock = async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      wakeLockRef.current.addEventListener("release", () => {
        // Re-acquire if page is still visible
        if (document.visibilityState === "visible") acquireWakeLock();
      });
    } catch {
      // Wake Lock denied — non-fatal
    }
  };

  const releaseWakeLock = () => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!activeTrip) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setGpsStatus("off");
      }
      releaseWakeLock();
      return;
    }

    acquireWakeLock();
    sendLocation(); // первый пинг сразу
    intervalRef.current = setInterval(sendLocation, GPS_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      releaseWakeLock();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrip?.id]);

  const formatDollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

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
    <>
    {viewingPhoto && (
      <div
        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        onClick={() => setViewingPhoto(null)}
      >
        <img src={viewingPhoto} alt="Receipt" className="max-w-full max-h-full rounded-xl object-contain" />
        <button className="absolute top-4 right-4 text-white text-3xl leading-none">×</button>
      </div>
    )}
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
            {/* GPS status */}
            <div className={`mt-3 flex items-center justify-center gap-2 text-sm rounded-lg py-2 ${
              gpsStatus === "active" ? "bg-green-50 text-green-700" :
              gpsStatus === "error" ? "bg-red-50 text-red-600" :
              "bg-slate-50 text-slate-500"
            }`}>
              <span>{gpsStatus === "active" ? "📍" : gpsStatus === "error" ? "⚠️" : "⏳"}</span>
              {gpsStatus === "active"
                ? `GPS tracking${currentSpeed != null ? ` · ${currentSpeed} mph` : ""} · every 30s`
                : gpsStatus === "error"
                ? "GPS unavailable — keep app open, check location permissions"
                : "Acquiring GPS..."}
            </div>
            {gpsStatus !== "error" && (
              <p className="text-center text-xs text-slate-400 mt-2">
                Keep screen on to maintain GPS tracking
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
            href="/driver/inspection/pre"
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
        <h2 className="text-lg font-semibold text-slate-600 mb-3">Today&apos;s Expenses</h2>
        {todayExpenses.length === 0 ? (
          <p className="text-slate-500 text-center py-4">No expenses yet today</p>
        ) : (
          <div className="space-y-2">
            {todayExpenses.map((exp) => (
              <div
                key={exp.id}
                className="bg-white rounded-xl p-4 flex items-center justify-between border border-slate-200 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{categoryIcons[exp.category] || "📋"}</span>
                  <div>
                    <p className="font-medium text-slate-800 capitalize">{exp.category}</p>
                    {exp.description && (
                      <p className="text-sm text-slate-500">{exp.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-800">
                    {formatDollars(exp.amountCents)}
                  </span>
                  {exp.receiptPath ? (
                    <button
                      onClick={() => setViewingPhoto(exp.receiptPath!)}
                      className="shrink-0"
                    >
                      <img
                        src={exp.receiptPath}
                        alt="receipt"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                      />
                    </button>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 text-xl shrink-0">
                      📄
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
