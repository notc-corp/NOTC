"use client";

import { useState, useRef } from "react";
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

type VoiceState = "idle" | "listening" | "parsing";

export default function ReceiptUpload() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [category, setCategory] = useState<string>("fuel");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"capture" | "confirm">("capture");
  const [saving, setSaving] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceText, setVoiceText] = useState<string>("");
  const recognitionRef = useRef<unknown>(null);
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
      const res = await fetch("/api/ocr/receipt", { method: "POST", body: formData });
      const data = await res.json();
      setReceiptData(data);
      if (data.fuel_type || data.gallons) setCategory("fuel");
      setStep("confirm");
    } catch {
      setStep("confirm");
    } finally {
      setLoading(false);
    }
  };

  const startVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SR) {
      alert("Voice input is not supported in this browser. Try Chrome.");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setVoiceState("listening");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setVoiceText(text);
      setVoiceState("parsing");

      try {
        const res = await fetch("/api/ai/voice-expense", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const parsed = await res.json();

        if (parsed.confidence > 0.4) {
          setReceiptData({
            station_name: parsed.description || null,
            date: null,
            fuel_type: parsed.category === "fuel" ? "diesel" : null,
            gallons: parsed.gallons || null,
            price_per_gallon: parsed.price_per_gallon || null,
            total: parsed.amount || null,
            confidence: parsed.confidence,
            notes: `Voice: "${text}"`,
          });
          if (parsed.category) setCategory(parsed.category);
          setStep("confirm");
        }
      } finally {
        setVoiceState("idle");
      }
    };

    recognition.onerror = () => setVoiceState("idle");
    recognition.onend = () => {
      if (voiceState === "listening") setVoiceState("idle");
    };

    recognition.start();
  };

  const stopVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (recognitionRef.current as any)?.stop();
    setVoiceState("idle");
  };

  const handleSave = async () => {
    if (!photo && !receiptData) return;
    setSaving(true);
    const formData = new FormData();
    if (photo) formData.append("photo", photo);
    formData.append("category", category);
    if (receiptData) formData.append("ocrData", JSON.stringify(receiptData));
    try {
      const res = await fetch("/api/expenses", { method: "POST", body: formData });
      if (res.ok) router.push("/driver");
    } finally {
      setSaving(false);
    }
  };

  const handleRetake = () => {
    setPhoto(null);
    setPreview(null);
    setReceiptData(null);
    setVoiceText("");
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
        <div className="space-y-3">
          {/* Photo button */}
          <label className="block w-full h-40 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer active:bg-slate-50">
            <span className="text-5xl mb-2">📷</span>
            <span className="text-lg font-medium text-slate-600">Tap to Take Photo</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </label>

          {/* Voice button */}
          <div className="text-center text-slate-400 text-sm">— or speak —</div>
          <button
            onPointerDown={voiceState === "idle" ? startVoice : stopVoice}
            className={`w-full h-16 rounded-2xl text-white text-lg font-bold flex items-center justify-center gap-3 transition-colors ${
              voiceState === "listening"
                ? "bg-red-500 animate-pulse"
                : voiceState === "parsing"
                ? "bg-amber-500"
                : "bg-blue-600 active:bg-blue-700"
            }`}
          >
            <span className="text-2xl">
              {voiceState === "listening" ? "🔴" : voiceState === "parsing" ? "⏳" : "🎤"}
            </span>
            {voiceState === "listening"
              ? "Listening... tap to stop"
              : voiceState === "parsing"
              ? "Parsing..."
              : "Speak Expense"}
          </button>

          {voiceText && (
            <p className="text-sm text-slate-500 text-center italic">"{voiceText}"</p>
          )}
        </div>
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
            <img src={preview} alt="Receipt" className="w-full rounded-xl max-h-64 object-contain" />
          )}

          {receiptData && (
            <div className="bg-white rounded-xl p-4 space-y-3 border border-slate-200 shadow-sm">
              {receiptData.notes?.startsWith("Voice:") && (
                <p className="text-blue-600 text-sm font-medium">🎤 {receiptData.notes}</p>
              )}
              {receiptData.station_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Location</span>
                  <span className="font-medium text-slate-800">{receiptData.station_name}</span>
                </div>
              )}
              {receiptData.gallons && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Gallons</span>
                  <span className="font-medium text-slate-800">{receiptData.gallons.toFixed(2)}</span>
                </div>
              )}
              {receiptData.price_per_gallon && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Price/Gallon</span>
                  <span className="font-medium text-slate-800">${receiptData.price_per_gallon.toFixed(3)}</span>
                </div>
              )}
              {receiptData.total && (
                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span className="text-slate-500 font-medium">Total</span>
                  <span className="text-2xl font-bold text-green-600">${receiptData.total.toFixed(2)}</span>
                </div>
              )}
              {receiptData.confidence < 0.7 && (
                <p className="text-yellow-600 text-sm">⚠️ Low confidence — please verify the amounts</p>
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
