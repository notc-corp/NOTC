"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PhotoCapture() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mileage, setMileage] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [manualMileage, setManualMileage] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"capture" | "confirm">("capture");
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action") || "start"; // "start" or "end"

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setLoading(true);

    // Upload and OCR
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await fetch("/api/ocr/odometer", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setMileage(data.mileage);
      setConfidence(data.confidence);
      if (data.confidence < 0.7 || data.mileage === null) {
        setShowManual(true);
      }
      setStep("confirm");
    } catch {
      setShowManual(true);
      setStep("confirm");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    const finalMileage = showManual && manualMileage
      ? parseFloat(manualMileage)
      : mileage;

    if (!finalMileage || !photo) {
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("photo", photo);
    formData.append("mileage", String(finalMileage));

    try {
      if (action === "start") {
        const res = await fetch("/api/trips/start", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          router.push("/driver");
        }
      } else {
        const res = await fetch("/api/trips/end", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          router.push("/driver");
        }
      }
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    setPhoto(null);
    setPreview(null);
    setMileage(null);
    setConfidence(null);
    setManualMileage("");
    setShowManual(false);
    setStep("capture");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-center text-slate-900">
        {action === "start" ? "Start Trip" : "End Trip"}
      </h1>
      <p className="text-slate-500 text-center">
        Take a photo of your odometer
      </p>

      {step === "capture" && (
        <div className="space-y-4">
          <label className="block w-full h-48 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer active:bg-slate-50">
            <span className="text-5xl mb-2">📷</span>
            <span className="text-lg font-medium text-slate-600">
              Tap to Take Photo
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </label>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3 animate-pulse">🔍</div>
          <p className="text-slate-600 text-lg">Reading odometer...</p>
        </div>
      )}

      {step === "confirm" && !loading && (
        <div className="space-y-4">
          {/* Photo Preview */}
          {preview && (
            <img
              src={preview}
              alt="Odometer"
              className="w-full rounded-xl"
            />
          )}

          {/* Extracted Mileage */}
          {mileage !== null && !showManual && (
            <div className="bg-white rounded-xl p-6 text-center border border-slate-200 shadow-sm">
              <p className="text-slate-500 text-sm mb-1">Mileage Reading</p>
              <p className="text-4xl font-bold text-green-600">
                {mileage.toLocaleString()} mi
              </p>
              {confidence !== null && (
                <p className="text-slate-400 text-xs mt-2">
                  Confidence: {Math.round(confidence * 100)}%
                </p>
              )}
            </div>
          )}

          {/* Manual Entry Fallback */}
          {showManual && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
              <p className="text-yellow-700 font-medium mb-2">
                {mileage
                  ? `We read ${mileage.toLocaleString()} mi — is that right?`
                  : "Couldn't read the odometer clearly"}
              </p>
              <input
                type="number"
                placeholder="Enter mileage manually"
                value={manualMileage}
                onChange={(e) => setManualMileage(e.target.value)}
                className="w-full h-14 rounded-xl bg-white text-slate-800 text-center text-2xl px-4 border border-slate-300 focus:border-amber-600 focus:outline-none"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleRetake}
              className="h-14 rounded-xl bg-slate-100 text-slate-800 text-lg font-medium active:bg-slate-200 border border-slate-200"
            >
              Retake
            </button>
            <button
              onClick={handleConfirm}
              disabled={
                loading ||
                (showManual ? !manualMileage : mileage === null)
              }
              className="h-14 rounded-xl bg-green-600 text-white text-lg font-bold active:bg-green-700 disabled:opacity-40"
            >
              Looks Right
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
