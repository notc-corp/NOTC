"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { id: "fuel", icon: "⛽", label: "Fuel" },
  { id: "tolls", icon: "🛣️", label: "Tolls" },
  { id: "maintenance", icon: "🔧", label: "Repair" },
  { id: "food", icon: "🍔", label: "Food" },
  { id: "other", icon: "📋", label: "Other" },
] as const;

interface ReceiptData {
  station_name: string | null;
  date: string | null;
  fuel_type: string | null;
  gallons: number | null;
  price_per_gallon: number | null;
  total: number | null;
  confidence: number;
  notes: string;
}

export default function ReceiptUpload() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [category, setCategory] = useState<string>("fuel");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"capture" | "confirm">("capture");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setLoading(true);

    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await fetch("/api/ocr/receipt", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setReceiptData(data);
      if (data.fuel_type || data.gallons) {
        setCategory("fuel");
      }
      setStep("confirm");
    } catch {
      setStep("confirm");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!photo) return;
    setSaving(true);

    const formData = new FormData();
    formData.append("photo", photo);
    formData.append("category", category);
    if (receiptData) {
      formData.append("ocrData", JSON.stringify(receiptData));
    }

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        router.push("/driver");
      }
    } catch {
      // Handle error
    } finally {
      setSaving(false);
    }
  };

  const handleRetake = () => {
    setPhoto(null);
    setPreview(null);
    setReceiptData(null);
    setStep("capture");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-center text-slate-900">Add Receipt</h1>

      {/* Category Selector */}
      <div className="grid grid-cols-5 gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`flex flex-col items-center p-3 rounded-xl transition-colors ${
              category === cat.id
                ? "bg-amber-600 text-white"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            <span className="text-2xl">{cat.icon}</span>
            <span className="text-xs mt-1">{cat.label}</span>
          </button>
        ))}
      </div>

      {step === "capture" && (
        <label className="block w-full h-48 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer active:bg-slate-50">
          <span className="text-5xl mb-2">📷</span>
          <span className="text-lg font-medium text-slate-600">
            Tap to Take Photo of Receipt
          </span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </label>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3 animate-pulse">🔍</div>
          <p className="text-slate-600 text-lg">Reading receipt...</p>
        </div>
      )}

      {step === "confirm" && !loading && (
        <div className="space-y-4">
          {preview && (
            <img
              src={preview}
              alt="Receipt"
              className="w-full rounded-xl max-h-64 object-contain"
            />
          )}

          {receiptData && (
            <div className="bg-white rounded-xl p-4 space-y-3 border border-slate-200 shadow-sm">
              {receiptData.station_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Station</span>
                  <span className="font-medium text-slate-800">{receiptData.station_name}</span>
                </div>
              )}
              {receiptData.gallons && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Gallons</span>
                  <span className="font-medium text-slate-800">
                    {receiptData.gallons.toFixed(2)}
                  </span>
                </div>
              )}
              {receiptData.price_per_gallon && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Price/Gallon</span>
                  <span className="font-medium text-slate-800">
                    ${receiptData.price_per_gallon.toFixed(3)}
                  </span>
                </div>
              )}
              {receiptData.total && (
                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span className="text-slate-500 font-medium">Total</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${receiptData.total.toFixed(2)}
                  </span>
                </div>
              )}
              {receiptData.confidence < 0.7 && (
                <p className="text-yellow-600 text-sm">
                  ⚠️ Low confidence reading — please verify the amounts above
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleRetake}
              className="h-14 rounded-xl bg-slate-100 text-slate-800 text-lg font-medium active:bg-slate-200 border border-slate-200"
            >
              Retake
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-14 rounded-xl bg-green-600 text-white text-lg font-bold active:bg-green-700 disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
