"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Category = "fuel" | "food" | "tolls" | "maintenance" | "other";

interface ScannedReceipt {
  id: string; // temp UI id
  merchant: string | null;
  date: string | null;
  time: string | null;
  category: Category;
  amount: number | null;
  gallons: number | null;
  price_per_gallon: number | null;
  fuel_type: string | null;
  notes: string;
  confidence: number;
  photoIndex: number;
  filePath?: string;
  status: "pending" | "confirmed" | "edited";
}

type Step = "ask" | "capture" | "analyzing" | "review" | "saving";

const CATEGORY_ICONS: Record<Category, string> = {
  fuel: "⛽",
  food: "🍔",
  tolls: "🛣️",
  maintenance: "🔧",
  other: "📋",
};

const CATEGORIES: Category[] = ["fuel", "food", "tolls", "maintenance", "other"];

export default function ReceiptScanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("ask");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [receipts, setReceipts] = useState<ScannedReceipt[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ScannedReceipt>>({});
  const [error, setError] = useState<string | null>(null);

  // --- Photo capture ---

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPhotos(prev => [...prev, ...files]);
    setPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    // Reset input so same file can be re-added
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // --- Analyze ---

  const analyze = async () => {
    if (!photos.length) return;
    setStep("analyzing");
    setError(null);

    const formData = new FormData();
    photos.forEach(p => formData.append("photos", p));

    try {
      const res = await fetch("/api/ai/scan-receipts", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Scan failed");

      const scanned: ScannedReceipt[] = (data.receipts || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any, i: number) => ({
          id: `r-${i}`,
          merchant: r.merchant || null,
          date: r.date || null,
          time: r.time || null,
          category: (CATEGORIES.includes(r.category) ? r.category : "other") as Category,
          amount: r.amount ?? null,
          gallons: r.gallons ?? null,
          price_per_gallon: r.price_per_gallon ?? null,
          fuel_type: r.fuel_type || null,
          notes: r.notes || "",
          confidence: r.confidence ?? 0,
          photoIndex: r.photoIndex ?? 0,
          filePath: r.filePath,
          status: "pending",
        })
      );

      if (scanned.length === 0) {
        setError("Чеки не найдены на фото. Попробуй ещё раз или добавь фото.");
        setStep("capture");
        return;
      }

      setReceipts(scanned);
      setStep("review");
    } catch {
      setError("Ошибка анализа. Проверь соединение и попробуй снова.");
      setStep("capture");
    }
  };

  // --- Edit ---

  const startEdit = (receipt: ScannedReceipt) => {
    setEditingId(receipt.id);
    setEditForm({ ...receipt });
  };

  const saveEdit = () => {
    setReceipts(prev =>
      prev.map(r =>
        r.id === editingId ? { ...r, ...editForm, status: "edited" } : r
      )
    );
    setEditingId(null);
    setEditForm({});
  };

  const confirmReceipt = (id: string) => {
    setReceipts(prev =>
      prev.map(r => (r.id === id ? { ...r, status: "confirmed" } : r))
    );
  };

  // --- Save all confirmed ---

  const saveAll = async () => {
    setStep("saving");
    const toSave = receipts.filter(r => r.status !== "pending");

    try {
      await Promise.all(
        toSave.map(r =>
          fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category: r.category,
              amountCents: r.amount ? Math.round(r.amount * 100) : 0,
              description: [r.merchant, r.date, r.notes].filter(Boolean).join(" · "),
              gallons: r.gallons,
              pricePerGallonCents: r.price_per_gallon
                ? Math.round(r.price_per_gallon * 100)
                : null,
              receiptPath: r.filePath,
              isManuallyEdited: r.status === "edited",
            }),
          })
        )
      );
    } catch {
      // Non-critical — proceed anyway
    }

    router.push("/driver/inspection/post");
  };

  const skipToInspection = () => router.push("/driver/inspection/post");

  const allReviewed = receipts.length > 0 && receipts.every(r => r.status !== "pending");

  // ===================== RENDER =====================

  if (step === "ask") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-center text-slate-900">Trip Receipts</h1>
        <p className="text-slate-500 text-center">
          Do you have any receipts from this trip?
        </p>
        <div className="space-y-3 pt-4">
          <button
            onClick={() => setStep("capture")}
            className="block w-full h-20 rounded-xl bg-amber-600 text-white text-xl font-bold active:bg-amber-700 transition-colors text-center leading-[5rem]"
          >
            📄 Yes, add receipts
          </button>
          <button
            onClick={skipToInspection}
            className="block w-full h-14 rounded-xl bg-slate-100 text-slate-600 text-lg font-medium active:bg-slate-200 transition-colors text-center leading-[3.5rem] border border-slate-200"
          >
            No receipts — continue
          </button>
        </div>
      </div>
    );
  }

  if (step === "capture") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-center text-slate-900">Photo Receipts</h1>
        <p className="text-slate-500 text-center text-sm">
          Photo all receipts together or one by one. AI will find each one automatically.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Photo previews */}
        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative">
                <img
                  src={src}
                  alt={`Receipt ${i + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-slate-200"
                />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add photo button */}
        <label className="block w-full h-16 rounded-xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center gap-2 cursor-pointer active:bg-slate-50">
          <span className="text-2xl">📷</span>
          <span className="text-lg font-medium text-slate-600">
            {previews.length === 0 ? "Take photo" : "Add another photo"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handlePhotoAdd}
            className="hidden"
          />
        </label>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={skipToInspection}
            className="h-14 rounded-xl bg-slate-100 text-slate-700 text-base font-medium active:bg-slate-200 border border-slate-200"
          >
            Skip
          </button>
          <button
            onClick={analyze}
            disabled={photos.length === 0}
            className="h-14 rounded-xl bg-amber-600 text-white text-base font-bold active:bg-amber-700 disabled:opacity-40 transition-colors"
          >
            Analyze {photos.length > 0 ? `(${photos.length})` : ""}
          </button>
        </div>
      </div>
    );
  }

  if (step === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="text-5xl animate-pulse">🤖</div>
        <p className="text-xl font-semibold text-slate-700">Analyzing receipts...</p>
        <p className="text-slate-500 text-sm">AI is reading {photos.length} photo{photos.length > 1 ? "s" : ""}</p>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">
            Found {receipts.length} receipt{receipts.length !== 1 ? "s" : ""}
          </h1>
          <span className="text-sm text-slate-500">
            {receipts.filter(r => r.status !== "pending").length}/{receipts.length} reviewed
          </span>
        </div>

        <div className="space-y-3">
          {receipts.map(receipt => (
            <div
              key={receipt.id}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-colors ${
                receipt.status === "confirmed" ? "border-green-300" :
                receipt.status === "edited" ? "border-amber-300" :
                "border-slate-200"
              }`}
            >
              {/* Receipt header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{CATEGORY_ICONS[receipt.category]}</span>
                    <div>
                      <p className="font-semibold text-slate-800 capitalize">
                        {receipt.merchant || receipt.category}
                      </p>
                      <p className="text-sm text-slate-500">
                        {[receipt.date, receipt.time].filter(Boolean).join(" ")}
                        {receipt.date && receipt.confidence < 0.6 && (
                          <span className="ml-1 text-amber-500">⚠️ low confidence</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-slate-800">
                      {receipt.amount != null ? `$${receipt.amount.toFixed(2)}` : "—"}
                    </p>
                    {receipt.gallons && (
                      <p className="text-xs text-slate-500">{receipt.gallons} gal</p>
                    )}
                  </div>
                </div>

                {receipt.notes && (
                  <p className="mt-2 text-xs text-slate-400 italic">{receipt.notes}</p>
                )}

                {/* Action buttons — only show if not in edit mode */}
                {editingId !== receipt.id && (
                  <div className="flex gap-2 mt-3">
                    {receipt.status !== "confirmed" && receipt.status !== "edited" ? (
                      <>
                        <button
                          onClick={() => confirmReceipt(receipt.id)}
                          className="flex-1 h-10 rounded-lg bg-green-600 text-white text-sm font-bold active:bg-green-700"
                        >
                          ✓ Confirm
                        </button>
                        <button
                          onClick={() => startEdit(receipt)}
                          className="flex-1 h-10 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium active:bg-slate-50"
                        >
                          ✏️ Edit
                        </button>
                      </>
                    ) : (
                      <div className={`flex-1 flex items-center justify-between px-3 h-10 rounded-lg text-sm font-medium ${
                        receipt.status === "confirmed" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        <span>{receipt.status === "confirmed" ? "✓ Confirmed" : "✏️ Edited"}</span>
                        <button
                          onClick={() => startEdit(receipt)}
                          className="text-xs underline opacity-60"
                        >
                          change
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Inline edit form */}
              {editingId === receipt.id && (
                <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 font-medium">Merchant</label>
                      <input
                        type="text"
                        value={editForm.merchant || ""}
                        onChange={e => setEditForm(f => ({ ...f, merchant: e.target.value }))}
                        className="w-full mt-1 h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white text-slate-800 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-medium">Date</label>
                      <input
                        type="date"
                        value={editForm.date || ""}
                        onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                        className="w-full mt-1 h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white text-slate-800 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 font-medium">Category</label>
                      <select
                        value={editForm.category || "other"}
                        onChange={e => setEditForm(f => ({ ...f, category: e.target.value as Category }))}
                        className="w-full mt-1 h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white text-slate-800 focus:border-amber-500 focus:outline-none"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-medium">Amount ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.amount ?? ""}
                        onChange={e => setEditForm(f => ({ ...f, amount: parseFloat(e.target.value) || null }))}
                        className="w-full mt-1 h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white text-slate-800 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {(editForm.category === "fuel") && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-500 font-medium">Gallons</label>
                        <input
                          type="number"
                          step="0.001"
                          value={editForm.gallons ?? ""}
                          onChange={e => setEditForm(f => ({ ...f, gallons: parseFloat(e.target.value) || null }))}
                          className="w-full mt-1 h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white text-slate-800 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 font-medium">$/gal</label>
                        <input
                          type="number"
                          step="0.001"
                          value={editForm.price_per_gallon ?? ""}
                          onChange={e => setEditForm(f => ({ ...f, price_per_gallon: parseFloat(e.target.value) || null }))}
                          className="w-full mt-1 h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white text-slate-800 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setEditingId(null); setEditForm({}); }}
                      className="flex-1 h-10 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm active:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      className="flex-1 h-10 rounded-lg bg-amber-600 text-white text-sm font-bold active:bg-amber-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add more photos */}
        <button
          onClick={() => setStep("capture")}
          className="w-full h-12 rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm active:bg-slate-50"
        >
          + Add more photos
        </button>

        {/* Continue button */}
        <button
          onClick={saveAll}
          disabled={!allReviewed}
          className="w-full h-16 rounded-xl bg-green-600 text-white text-lg font-bold active:bg-green-700 disabled:opacity-40 transition-colors"
        >
          {allReviewed
            ? `Save ${receipts.filter(r => r.status !== "pending").length} receipts & continue`
            : `Review all receipts to continue`}
        </button>

        <button
          onClick={skipToInspection}
          className="w-full text-center text-sm text-slate-400 underline py-1"
        >
          Skip receipts
        </button>
      </div>
    );
  }

  if (step === "saving") {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="text-5xl animate-pulse">💾</div>
        <p className="text-xl font-semibold text-slate-700">Saving receipts...</p>
      </div>
    );
  }

  return null;
}
