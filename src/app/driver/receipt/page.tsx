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

  // Editable form fields (pre-filled by OCR/voice, editable by driver)
  const [editStation, setEditStation] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTotal, setEditTotal] = useState("");
  const [editGallons, setEditGallons] = useState("");
  const [editPpg, setEditPpg] = useState("");

  const populateForm = (data: ReceiptData) => {
    setEditStation(data.station_name || "");
    setEditDate(data.date || "");
    setEditTotal(data.total != null ? String(data.total) : "");
    setEditGallons(data.gallons != null ? String(data.gallons) : "");
    setEditPpg(data.price_per_gallon != null ? String(data.price_per_gallon) : "");
  };

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
      populateForm(data);
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
          const data: ReceiptData = {
            station_name: parsed.description || null,
            date: null,
            fuel_type: parsed.category === "fuel" ? "diesel" : null,
            gallons: parsed.gallons || null,
            price_per_gallon: parsed.price_per_gallon || null,
            total: parsed.amount || null,
            confidence: parsed.confidence,
            notes: `Voice: "${text}"`,
          };
          setReceiptData(data);
          populateForm(data);
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
    setSaving(true);
    const totalVal = parseFloat(editTotal) || 0;
    const gallonsVal = parseFloat(editGallons) || null;
    const ppgVal = parseFloat(editPpg) || null;

    const editedOcr = {
      station_name: editStation || null,
      date: editDate || null,
      total: totalVal || null,
      gallons: gallonsVal,
      price_per_gallon: ppgVal,
      confidence: receiptData?.confidence ?? null,
      isManuallyEdited: receiptData ? (
        editStation !== (receiptData.station_name || "") ||
        editTotal !== (receiptData.total != null ? String(receiptData.total) : "") ||
        editGallons !== (receiptData.gallons != null ? String(receiptData.gallons) : "")
      ) : true,
    };

    const formData = new FormData();
    if (photo) formData.append("photo", photo);
    formData.append("category", category);
    formData.append("ocrData", JSON.stringify(editedOcr));
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
    setEditStation("");
    setEditDate("");
    setEditTotal("");
    setEditGallons("");
    setEditPpg("");
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
            <p className="text-sm text-slate-500 text-center italic">&quot;{voiceText}&quot;</p>
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
            <img src={preview} alt="Receipt" className="w-full rounded-xl max-h-56 object-contain border border-slate-200" />
          )}

          {/* AI confidence badge */}
          {receiptData && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              receiptData.confidence >= 0.8
                ? "bg-green-50 text-green-700"
                : receiptData.confidence >= 0.5
                ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-700"
            }`}>
              <span>{receiptData.confidence >= 0.8 ? "✓" : "⚠️"}</span>
              <span>
                {receiptData.notes?.startsWith("Voice:")
                  ? receiptData.notes
                  : receiptData.confidence >= 0.8
                  ? "AI read this receipt — verify the fields below"
                  : receiptData.confidence >= 0.5
                  ? "Low confidence — please check the fields"
                  : "Couldn't read clearly — enter manually"}
              </span>
            </div>
          )}

          {/* Editable form */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {/* Station */}
            <div className="px-4 py-3">
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Station / Merchant</label>
              <input
                type="text"
                value={editStation}
                onChange={e => setEditStation(e.target.value)}
                placeholder="e.g. Shell, Pilot, TA"
                className="w-full mt-1 h-10 rounded-lg border border-slate-200 px-3 text-slate-800 text-base focus:border-amber-500 focus:outline-none bg-slate-50"
              />
            </div>

            {/* Date */}
            <div className="px-4 py-3">
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Date</label>
              <input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="w-full mt-1 h-10 rounded-lg border border-slate-200 px-3 text-slate-800 text-base focus:border-amber-500 focus:outline-none bg-slate-50"
              />
            </div>

            {/* Total */}
            <div className="px-4 py-3">
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Amount ($)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={editTotal}
                onChange={e => setEditTotal(e.target.value)}
                placeholder="0.00"
                className="w-full mt-1 h-10 rounded-lg border border-slate-200 px-3 text-slate-800 text-base focus:border-amber-500 focus:outline-none bg-slate-50"
              />
            </div>

            {/* Gallons + PPG — only for fuel */}
            {category === "fuel" && (
              <div className="px-4 py-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Gallons</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.001"
                    min="0"
                    value={editGallons}
                    onChange={e => setEditGallons(e.target.value)}
                    placeholder="0.000"
                    className="w-full mt-1 h-10 rounded-lg border border-slate-200 px-3 text-slate-800 text-base focus:border-amber-500 focus:outline-none bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium uppercase tracking-wide">$/Gallon</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.001"
                    min="0"
                    value={editPpg}
                    onChange={e => setEditPpg(e.target.value)}
                    placeholder="0.000"
                    className="w-full mt-1 h-10 rounded-lg border border-slate-200 px-3 text-slate-800 text-base focus:border-amber-500 focus:outline-none bg-slate-50"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
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
