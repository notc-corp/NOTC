"use client";

import { useEffect, useState } from "react";

type Platform = "android" | "ios" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>("other");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosModal, setShowIosModal] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    setPlatform(detectPlatform());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  if (installed) return null;

  const handleInstallClick = async () => {
    if (platform === "ios") {
      setShowIosModal(true);
      return;
    }
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
    } else if (platform === "android") {
      setShowIosModal(true);
    }
  };

  const showButton = platform === "ios" || deferredPrompt !== null || platform === "android";
  if (!showButton) return null;

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="w-full h-12 rounded-xl border-2 border-amber-600 text-amber-700 font-semibold text-base flex items-center justify-center gap-2 active:bg-amber-50 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Install the App
      </button>

      {/* iOS / fallback instructions modal */}
      {showIosModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4" onClick={() => setShowIosModal(false)}>
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm mb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Install TruckAudit</h2>
              <button onClick={() => setShowIosModal(false)} className="text-slate-400 text-2xl leading-none">×</button>
            </div>

            {platform === "ios" ? (
              <ol className="space-y-4 text-slate-700 text-sm">
                <li className="flex items-start gap-3">
                  <span className="bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                  <span>
                    Tap the <strong>Share</strong> button at the bottom of Safari
                    {" "}
                    <span className="inline-block bg-slate-100 rounded px-1.5 py-0.5 text-base">⬆</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                  <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                  <span>Tap <strong>"Add"</strong> in the top right corner</span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-4 text-slate-700 text-sm">
                <li className="flex items-start gap-3">
                  <span className="bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                  <span>Open this page in <strong>Chrome</strong> browser</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                  <span>Tap the menu <strong>⋮</strong> in the top right</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                  <span>Tap <strong>"Add to Home screen"</strong></span>
                </li>
              </ol>
            )}

            <p className="mt-4 text-xs text-slate-400 text-center">
              The app icon will appear on your home screen
            </p>
          </div>
        </div>
      )}
    </>
  );
}
