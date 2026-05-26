"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Severity = "minor" | "major" | "out_of_service";
type Step = "form" | "submitting" | "downtime" | "done";

const SEVERITY_OPTIONS: { value: Severity; label: string; color: string; icon: string }[] = [
  { value: "minor",         label: "Minor",         color: "border-yellow-400 bg-yellow-50 text-yellow-800",  icon: "⚠️" },
  { value: "major",         label: "Major",         color: "border-orange-400 bg-orange-50 text-orange-800",  icon: "🔴" },
  { value: "out_of_service",label: "Out of Service",color: "border-red-500 bg-red-50 text-red-800",           icon: "🚫" },
];

export default function ReportIssuePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("form");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("minor");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [defectId, setDefectId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!description.trim()) { setError("Please describe the issue"); return; }
    setError(null);
    setStep("submitting");

    const formData = new FormData();
    formData.append("description", description);
    formData.append("severity", severity);
    if (photo) formData.append("photo", photo);

    try {
      const res = await fetch("/api/defects", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDefectId(data.defect.id);

      if (severity === "out_of_service") {
        setStep("downtime");
      } else {
        setStep("done");
      }
    } catch {
      setError("Failed to submit. Try again.");
      setStep("form");
    }
  };

  const startDowntime = async () => {
    await fetch("/api/downtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defectId, reason: description }),
    });
    setStep("done");
  };

  const skipDowntime = () => setStep("done");

  // FORM
  if (step === "form") {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔧</span>
          <h1 className="text-xl font-bold text-slate-900">Report Issue</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>
        )}

        {/* Severity */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Severity</label>
          <div className="space-y-2">
            {SEVERITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSeverity(opt.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  severity === opt.value ? opt.color + " border-2" : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <span className="text-xl">{opt.icon}</span>
                <span className="font-semibold">{opt.label}</span>
                {severity === opt.value && <span className="ml-auto text-lg">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            rows={4}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 text-sm focus:border-amber-500 focus:outline-none resize-none bg-white"
          />
        </div>

        {/* Photo */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Photo <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Issue" className="w-full rounded-xl border border-slate-200 max-h-48 object-cover" />
              <button
                onClick={() => { setPhoto(null); setPreview(null); }}
                className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full text-sm flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ) : (
            <label className="block w-full h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center gap-2 cursor-pointer active:bg-slate-50">
              <span className="text-xl">📷</span>
              <span className="text-slate-500 text-sm font-medium">Take photo</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => router.back()}
            className="h-14 rounded-xl bg-slate-100 text-slate-700 font-medium border border-slate-200 active:bg-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!description.trim()}
            className="h-14 rounded-xl bg-red-600 text-white font-bold active:bg-red-700 disabled:opacity-40"
          >
            Submit Report
          </button>
        </div>
      </div>
    );
  }

  // SUBMITTING
  if (step === "submitting") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-5xl animate-pulse">📋</div>
        <p className="text-xl font-semibold text-slate-700">Submitting report...</p>
      </div>
    );
  }

  // DOWNTIME PROMPT (Out of Service only)
  if (step === "downtime") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-3">🚫</div>
          <h1 className="text-xl font-bold text-slate-900">Out of Service reported</h1>
          <p className="text-slate-500 mt-2 text-sm">Do you want to start a downtime timer?<br/>It will track how long the truck is out of service.</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <strong>Downtime timer</strong> records start and end time. Your manager will see the total duration in reports.
        </div>

        <div className="space-y-3">
          <button
            onClick={startDowntime}
            className="w-full h-16 rounded-xl bg-red-600 text-white text-lg font-bold active:bg-red-700"
          >
            ⏱ Start Downtime Timer
          </button>
          <button
            onClick={skipDowntime}
            className="w-full h-12 rounded-xl bg-slate-100 text-slate-600 font-medium active:bg-slate-200 border border-slate-200"
          >
            Skip — report only
          </button>
        </div>
      </div>
    );
  }

  // DONE
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="text-5xl">✅</div>
      <h1 className="text-xl font-bold text-slate-900">Report submitted</h1>
      <p className="text-slate-500 text-sm">Your manager has been notified.</p>
      <button
        onClick={() => router.push("/driver")}
        className="mt-4 h-14 w-full rounded-xl bg-amber-600 text-white font-bold active:bg-amber-700"
      >
        Back to Dashboard
      </button>
    </div>
  );
}
