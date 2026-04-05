"use client";

import { useEffect, useState } from "react";

interface Trip {
  id: number;
  driverId: number;
  driverName: string;
  truckNumber: string | null;
  status: string;
  startOdometer: number | null;
  endOdometer: number | null;
  startedAt: string;
  endedAt: string | null;
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
    fetch(`/api/trips${params}`)
      .then((r) => r.json())
      .then((data) => {
        setTrips(data.trips || []);
        setLoading(false);
      });
  }, [statusFilter]);

  const statusColors: Record<string, string> = {
    active: "bg-green-600 text-white",
    completed: "bg-amber-600 text-white",
    cancelled: "bg-red-600 text-white",
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Trips</h1>
        <div className="flex gap-2">
          {["all", "active", "completed"].map((s) => (
            <button
              key={s}
              onClick={() => { setLoading(true); setStatusFilter(s); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
                statusFilter === s
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {trips.length === 0 ? (
        <p className="text-slate-500 text-center py-8">No trips found.</p>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium text-slate-800">{trip.driverName}</span>
                  {trip.truckNumber && (
                    <span className="text-slate-500 text-sm ml-2">
                      {trip.truckNumber}
                    </span>
                  )}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    statusColors[trip.status] || "bg-slate-200 text-slate-600"
                  }`}
                >
                  {trip.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Start:</span>{" "}
                  <span className="text-slate-800">
                    {trip.startOdometer
                      ? `${trip.startOdometer.toLocaleString()} mi`
                      : "—"}
                  </span>
                  <div className="text-slate-400 text-xs">
                    {new Date(trip.startedAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">End:</span>{" "}
                  <span className="text-slate-800">
                    {trip.endOdometer
                      ? `${trip.endOdometer.toLocaleString()} mi`
                      : "—"}
                  </span>
                  {trip.endedAt && (
                    <div className="text-slate-400 text-xs">
                      {new Date(trip.endedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              {trip.startOdometer && trip.endOdometer && (
                <div className="mt-2 text-sm">
                  <span className="text-slate-500">Distance:</span>{" "}
                  <span className="font-medium text-green-600">
                    {(trip.endOdometer - trip.startOdometer).toLocaleString()} mi
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
