"use client";

import { useEffect, useState } from "react";

interface Report {
  id: number;
  reportDate: string;
  generatedAt: string;
  anomalyCount: number;
  reportJson: string;
}

interface ReportData {
  fleet_summary: {
    total_miles: number;
    total_fuel_cost_cents: number;
    total_gallons: number;
    fleet_avg_mpg: number;
    active_drivers: number;
    completed_trips: number;
    anomaly_count: { info: number; warning: number; critical: number };
  };
  driver_summaries: Array<{
    driver_name: string;
    truck_number: string | null;
    trips: Array<{
      trip_id: number;
      miles_driven: number;
      actual_mpg: number | null;
      actual_fuel_cost_cents: number;
      anomalies: string[];
    }>;
  }>;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadReports = () => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((data) => {
        setReports(data.reports || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    const today = new Date().toISOString().split("T")[0];
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today }),
    });
    setGenerating(false);
    loadReports();
  };

  const formatDollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handleExport = async (reportId: number) => {
    const res = await fetch(`/api/reports/${reportId}/export`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-report-${reportId}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Audit Reports</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg font-medium active:bg-amber-700 disabled:opacity-40"
        >
          {generating ? "Generating..." : "Generate Today's Report"}
        </button>
      </div>

      {/* Report Detail */}
      {selectedReport && (() => {
        let parsed: ReportData | null = null;
        try {
          parsed = JSON.parse(selectedReport.reportJson);
        } catch {
          // ignore
        }
        return parsed ? (
          <div className="bg-white rounded-xl p-4 space-y-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Report: {selectedReport.reportDate}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport(selectedReport.id)}
                  className="text-sm bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-sm bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Fleet Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-500">Total Miles</p>
                <p className="text-xl font-bold text-slate-800">
                  {parsed.fleet_summary.total_miles.toLocaleString()}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-500">Fuel Cost</p>
                <p className="text-xl font-bold text-slate-800">
                  {formatDollars(parsed.fleet_summary.total_fuel_cost_cents)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-500">Fleet Avg MPG</p>
                <p className="text-xl font-bold text-slate-800">
                  {parsed.fleet_summary.fleet_avg_mpg.toFixed(1)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-500">Anomalies</p>
                <p className="text-xl font-bold">
                  <span className="text-red-600">
                    {parsed.fleet_summary.anomaly_count.critical}
                  </span>
                  {" / "}
                  <span className="text-yellow-600">
                    {parsed.fleet_summary.anomaly_count.warning}
                  </span>
                  {" / "}
                  <span className="text-amber-600">
                    {parsed.fleet_summary.anomaly_count.info}
                  </span>
                </p>
              </div>
            </div>

            {/* Driver Summaries */}
            {parsed.driver_summaries.map((ds, i) => (
              <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="font-medium text-slate-800">
                  {ds.driver_name}
                  {ds.truck_number && (
                    <span className="text-slate-500 text-sm ml-2">
                      {ds.truck_number}
                    </span>
                  )}
                </p>
                {ds.trips.map((trip) => (
                  <div
                    key={trip.trip_id}
                    className="mt-2 text-sm grid grid-cols-3 gap-2 text-slate-700"
                  >
                    <span>
                      {trip.miles_driven.toLocaleString()} mi
                    </span>
                    <span>
                      {trip.actual_mpg
                        ? `${trip.actual_mpg.toFixed(1)} mpg`
                        : "— mpg"}
                    </span>
                    <span>{formatDollars(trip.actual_fuel_cost_cents)}</span>
                    {trip.anomalies.length > 0 && (
                      <div className="col-span-3 mt-1 space-y-1">
                        {trip.anomalies.map((a, j) => (
                          <p
                            key={j}
                            className="text-yellow-700 text-xs bg-yellow-50 border border-yellow-200 px-2 py-1 rounded"
                          >
                            ⚠️ {a}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : null;
      })()}

      {/* Reports List */}
      {reports.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          No reports yet. Generate your first report above.
        </p>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className="w-full bg-white rounded-xl p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm"
            >
              <div>
                <p className="font-medium text-slate-800">{report.reportDate}</p>
                <p className="text-xs text-slate-500">
                  Generated {new Date(report.generatedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {report.anomalyCount > 0 ? (
                  <span className="bg-yellow-100 text-yellow-700 border border-yellow-300 px-2 py-0.5 rounded-full text-xs font-medium">
                    {report.anomalyCount} anomalies
                  </span>
                ) : (
                  <span className="bg-green-100 text-green-700 border border-green-300 px-2 py-0.5 rounded-full text-xs font-medium">
                    Clean
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
