"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Expense {
  id: number;
  driverId: number;
  category: string;
  amountCents: number;
  description: string | null;
  stationName: string | null;
  gallons: number | null;
  pricePerGallonCents: number | null;
  receiptPath: string | null;
  isManuallyEdited: boolean;
  createdAt: string;
}

interface Driver {
  id: number;
  name: string;
  isActive: boolean;
}

interface Analysis {
  summary: string;
  insights: string[];
  anomalies: string[];
  forecast: string | null;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisDays, setAnalysisDays] = useState(30);
  const [uploadDriver, setUploadDriver] = useState<string>("");
  const [uploadCategory, setUploadCategory] = useState("fuel");
  const [uploadPhoto, setUploadPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const searchParams = useSearchParams();

  const loadData = () => {
    Promise.all([
      fetch("/api/expenses").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([expData, userData]) => {
      setExpenses(expData.expenses || []);
      setDrivers(userData.users || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    if (searchParams.get("upload") === "true") {
      setShowUpload(true);
    }
  }, [searchParams]);

  const formatDollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const runAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const res = await fetch(`/api/ai/expenses-analysis?days=${analysisDays}`);
      setAnalysis(await res.json());
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadPhoto || !uploadDriver) return;
    setUploading(true);

    // First OCR the receipt
    const ocrForm = new FormData();
    ocrForm.append("photo", uploadPhoto);
    const ocrRes = await fetch("/api/ocr/receipt", {
      method: "POST",
      body: ocrForm,
    });
    const ocrData = await ocrRes.json();

    // Then create the expense
    const expForm = new FormData();
    expForm.append("photo", uploadPhoto);
    expForm.append("category", uploadCategory);
    expForm.append("driverId", uploadDriver);
    expForm.append("ocrData", JSON.stringify(ocrData));

    await fetch("/api/expenses", { method: "POST", body: expForm });

    setShowUpload(false);
    setUploadPhoto(null);
    setUploadDriver("");
    setUploading(false);
    loadData();
  };

  const categoryIcons: Record<string, string> = {
    fuel: "⛽",
    tolls: "🛣️",
    maintenance: "🔧",
    food: "🍔",
    other: "📋",
  };

  const getDriverName = (id: number) =>
    drivers.find((d) => d.id === id)?.name || "Unknown";

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg font-medium active:bg-amber-700"
        >
          {showUpload ? "Cancel" : "📷 Upload Receipt"}
        </button>
      </div>

      {/* AI Analysis */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">🤖 AI Expense Analysis</h2>
            <p className="text-sm text-slate-500 mt-0.5">Anomalies, trends and forecast</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={analysisDays}
              onChange={(e) => setAnalysisDays(Number(e.target.value))}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
            <button
              onClick={runAnalysis}
              disabled={analysisLoading}
              className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium active:bg-violet-700 disabled:opacity-50"
            >
              {analysisLoading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </div>

        {analysisLoading && (
          <div className="border-t border-slate-100 p-6 text-center text-slate-400">
            <div className="text-3xl mb-2 animate-pulse">🤖</div>
            <p>Analyzing your expenses...</p>
          </div>
        )}

        {analysis && !analysisLoading && (
          <div className="border-t border-slate-100 p-4 space-y-3">
            <p className="text-slate-700 text-sm">{analysis.summary}</p>

            {analysis.insights.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Insights</p>
                <ul className="space-y-1">
                  {analysis.insights.map((ins, i) => (
                    <li key={i} className="text-sm text-slate-700 flex gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>{ins}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.anomalies.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Anomalies</p>
                <ul className="space-y-1">
                  {analysis.anomalies.map((a, i) => (
                    <li key={i} className="text-sm text-amber-700 flex gap-2 bg-amber-50 rounded-lg p-2">
                      <span>⚠️</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.forecast && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                📈 <strong>Forecast:</strong> {analysis.forecast}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload on behalf form */}
      {showUpload && (
        <div className="bg-white rounded-xl p-4 space-y-3 border border-slate-200 shadow-sm">
          <h2 className="font-semibold text-lg text-slate-900">
            Upload Receipt for a Driver
          </h2>
          <select
            value={uploadDriver}
            onChange={(e) => setUploadDriver(e.target.value)}
            className="w-full h-12 rounded-lg bg-white px-4 text-slate-800 border border-slate-300"
          >
            <option value="">Select driver...</option>
            {drivers
              .filter((d) => d.isActive)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
          <select
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            className="w-full h-12 rounded-lg bg-white px-4 text-slate-800 border border-slate-300"
          >
            <option value="fuel">⛽ Fuel</option>
            <option value="tolls">🛣️ Tolls</option>
            <option value="maintenance">🔧 Maintenance</option>
            <option value="food">🍔 Food</option>
            <option value="other">📋 Other</option>
          </select>
          <label className="block w-full h-32 rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer">
            <span className="text-3xl mb-1">
              {uploadPhoto ? "✅" : "📷"}
            </span>
            <span className="text-sm text-slate-600">
              {uploadPhoto ? uploadPhoto.name : "Tap to select receipt photo"}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setUploadPhoto(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
          <button
            onClick={handleUpload}
            disabled={!uploadPhoto || !uploadDriver || uploading}
            className="w-full h-12 rounded-lg bg-green-600 text-white font-bold disabled:opacity-40"
          >
            {uploading ? "Processing..." : "Upload & Process"}
          </button>
        </div>
      )}

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <p className="text-slate-500 text-center py-8">No expenses yet.</p>
      ) : (
        <div className="space-y-2">
          {expenses.map((exp) => (
            <div
              key={exp.id}
              className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">
                    {categoryIcons[exp.category] || "📋"}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">
                      {getDriverName(exp.driverId)}{" "}
                      <span className="text-slate-500 capitalize text-sm">
                        — {exp.category}
                      </span>
                    </p>
                    <p className="text-sm text-slate-500 truncate">
                      {exp.stationName || exp.description || ""}
                      {exp.gallons &&
                        ` · ${exp.gallons.toFixed(1)} gal`}
                      {exp.pricePerGallonCents &&
                        ` @ ${formatDollars(exp.pricePerGallonCents)}/gal`}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(exp.createdAt).toLocaleString()}
                      {exp.isManuallyEdited && (
                        <span className="ml-2 text-yellow-600">(edited)</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-lg font-bold text-slate-800">
                    {formatDollars(exp.amountCents)}
                  </span>
                  {exp.receiptPath ? (
                    <button onClick={() => setViewingPhoto(exp.receiptPath!)}>
                      <img
                        src={exp.receiptPath}
                        alt="receipt"
                        className="w-14 h-14 rounded-lg object-cover border border-slate-200 hover:opacity-80 transition-opacity"
                      />
                    </button>
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 text-xl">
                      📄
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
