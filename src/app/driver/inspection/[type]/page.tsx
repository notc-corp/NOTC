"use client";

import { useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { PRE_TRIP_CHECKLIST, POST_TRIP_CHECKLIST } from "@/lib/inspection-checklist";
import SignaturePad, { type SignaturePadHandle } from "@/components/SignaturePad";

type Status = "ok" | "defect" | null;

interface ItemState {
  category: string;
  item: string;
  status: Status;
  isOutOfService: boolean;
}

type Step = "checklist" | "signature";

export default function InspectionPage() {
  const { type } = useParams() as { type: "pre" | "post" };
  const router = useRouter();
  const checklist = type === "post" ? POST_TRIP_CHECKLIST : PRE_TRIP_CHECKLIST;

  const [step, setStep] = useState<Step>("checklist");
  const [items, setItems] = useState<ItemState[]>(() =>
    checklist.flatMap((cat) =>
      cat.items.map((i) => ({
        category: cat.category,
        item: i.item,
        status: null,
        isOutOfService: i.isOutOfService ?? false,
      }))
    )
  );
  const [submitting, setSubmitting] = useState(false);
  const signaturePadRef = useRef<SignaturePadHandle>(null);

  const pending = items.filter((i) => i.status === null).length;
  const hasOOS = items.some((i) => i.isOutOfService && i.status === "defect");
  const hasDefects = items.some((i) => i.status === "defect");
  const checklistDone = pending === 0 && !(type === "pre" && hasOOS);

  const setStatus = (category: string, item: string, status: Status) =>
    setItems((prev) =>
      prev.map((i) => (i.category === category && i.item === item ? { ...i, status } : i))
    );

  const submitInspection = async () => {
    setSubmitting(true);
    const signatureDataUrl = signaturePadRef.current?.getDataUrl() ?? null;
    const res = await fetch("/api/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        items: items.map(({ category, item, status }) => ({ category, item, status: status ?? "ok" })),
        signatureDataUrl,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) return;
    router.push(type === "pre" && data.safeToOperate ? "/driver/photo?action=start" : "/driver");
  };

  // ── Signature step ──────────────────────────────────────────────────────
  if (step === "signature") {
    return (
      <div className="space-y-6 pb-8">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center">
          <h1 className="text-xl font-bold text-slate-800">Driver Signature</h1>
          <p className="text-sm text-slate-500 mt-1">
            {type === "pre" ? "Pre-Trip" : "Post-Trip"} Inspection
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            I certify that this vehicle has been inspected in accordance with applicable motor vehicle inspection requirements, and that no defect or deficiency is likely to affect the safe operation of this vehicle, except those noted above.
          </p>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Sign below
              </label>
              <button
                type="button"
                onClick={() => signaturePadRef.current?.clear()}
                className="text-xs text-slate-400 underline"
              >
                Clear
              </button>
            </div>
            <SignaturePad ref={signaturePadRef} />
            <p className="text-xs text-slate-400 text-center mt-1">Draw your signature with your finger</p>
          </div>
        </div>

        {hasDefects && (
          <div className={`rounded-2xl p-4 border ${hasOOS ? "bg-red-100 border-red-400" : "bg-amber-50 border-amber-300"}`}>
            <p className={`font-bold text-center text-sm ${hasOOS ? "text-red-700" : "text-amber-700"}`}>
              {hasOOS ? "⛔ OUT-OF-SERVICE noted" : "⚠️ Defects noted — reported to owner"}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={submitInspection}
            disabled={submitting}
            className="w-full h-16 rounded-xl bg-blue-600 text-white text-xl font-bold active:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {submitting ? "Saving..." : type === "pre" ? "Sign & Start Trip" : "Sign & Finish"}
          </button>
          <button
            onClick={submitInspection}
            disabled={submitting}
            className="w-full text-center text-sm text-slate-400 underline py-1"
          >
            Skip signature
          </button>
        </div>
      </div>
    );
  }

  // ── Checklist step ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-8">
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center">
        <h1 className="text-xl font-bold text-slate-800">
          {type === "post" ? "Post-Trip" : "Pre-Trip"} Inspection
        </h1>
        <p className="text-sm text-slate-500 mt-1">2013 Freightliner 114SD</p>
        <p className={`text-sm font-semibold mt-2 ${pending ? "text-amber-600" : "text-green-600"}`}>
          {pending ? `${pending} item${pending !== 1 ? "s" : ""} remaining` : "✓ All items reviewed"}
        </p>
      </div>

      {checklist.map((cat) => (
        <div
          key={cat.category}
          className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
            cat.category === "OUT-OF-SERVICE" ? "border-red-300" : "border-slate-200"
          }`}
        >
          <div className={`px-4 py-2 ${cat.category === "OUT-OF-SERVICE" ? "bg-red-50" : "bg-slate-50"}`}>
            <h2 className={`font-bold text-xs tracking-wide ${cat.category === "OUT-OF-SERVICE" ? "text-red-700" : "text-slate-500"}`}>
              {cat.category === "OUT-OF-SERVICE"
                ? "⛔ OUT-OF-SERVICE — tap YES only if issue exists"
                : cat.category}
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {cat.items.map((catItem) => {
              const status =
                items.find((i) => i.category === cat.category && i.item === catItem.item)?.status ?? null;
              return (
                <div key={catItem.item} className="px-4 py-3 flex items-center justify-between gap-3">
                  <span
                    className={`text-sm flex-1 ${
                      status === null
                        ? "text-slate-400"
                        : status === "defect"
                        ? "text-red-700 font-medium"
                        : "text-slate-800"
                    }`}
                  >
                    {catItem.item}
                  </span>
                  <div className="flex gap-2">
                    {(["ok", "defect"] as Status[]).map((s) => (
                      <button
                        key={s}
                        onPointerDown={() => setStatus(cat.category, catItem.item, s)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          status === s
                            ? s === "ok"
                              ? "bg-green-600 text-white"
                              : "bg-red-600 text-white"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {s === "ok" ? "OK" : catItem.isOutOfService ? "YES" : "DEFECT"}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {hasDefects && (
        <div className={`rounded-2xl p-4 border ${hasOOS ? "bg-red-100 border-red-400" : "bg-amber-50 border-amber-300"}`}>
          <p className={`font-bold text-center ${hasOOS ? "text-red-700" : "text-amber-700"}`}>
            {hasOOS
              ? "⛔ OUT-OF-SERVICE — Vehicle cannot be operated"
              : "⚠️ Defects found — report to owner"}
          </p>
        </div>
      )}

      <button
        onPointerDown={checklistDone ? () => setStep("signature") : undefined}
        className={`w-full h-16 rounded-xl text-xl font-bold transition-colors ${
          checklistDone
            ? "bg-blue-600 text-white active:bg-blue-700"
            : "bg-slate-200 text-slate-400"
        }`}
      >
        {!pending
          ? type === "pre" && hasOOS
            ? "Cannot Start — Out of Service"
            : "Next: Sign →"
          : `${pending} item${pending !== 1 ? "s" : ""} left`}
      </button>
    </div>
  );
}
