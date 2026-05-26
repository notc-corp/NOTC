"use client";

import { useEffect, useState } from "react";

interface Inspection {
  id: number;
  driverId: number;
  tripId: number | null;
  type: "pre" | "post";
  safeToOperate: boolean | null;
  hasDefects: boolean;
  hasOutOfService: boolean;
  completedAt: string;
}

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inspections")
      .then((r) => r.json())
      .then((data) => {
        setInspections(data.inspections || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center py-12 text-slate-500">Loading...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Inspections</h1>

      {inspections.length === 0 ? (
        <p className="text-slate-500 text-center py-8">No inspections yet</p>
      ) : (
        <div className="space-y-3">
          {inspections.map((insp) => (
            <div
              key={insp.id}
              className={`bg-white rounded-xl p-4 border shadow-sm ${
                insp.hasOutOfService
                  ? "border-red-400"
                  : insp.hasDefects
                  ? "border-amber-400"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${insp.type === "pre" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                    {insp.type === "pre" ? "PRE-TRIP" : "POST-TRIP"}
                  </span>
                  {insp.hasOutOfService && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                      ⛔ OUT-OF-SERVICE
                    </span>
                  )}
                  {insp.hasDefects && !insp.hasOutOfService && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                      ⚠️ DEFECTS
                    </span>
                  )}
                  {!insp.hasDefects && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                      ✓ CLEAR
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(insp.completedAt).toLocaleString()}
                </span>
              </div>
              <div className="text-sm text-slate-600">
                Driver #{insp.driverId}
                {insp.tripId && <span className="ml-2 text-slate-400">· Trip #{insp.tripId}</span>}
              </div>
              <div className="mt-1 text-sm font-medium">
                Safe to operate:{" "}
                <span className={insp.safeToOperate ? "text-green-600" : "text-red-600"}>
                  {insp.safeToOperate ? "YES" : "NO"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
