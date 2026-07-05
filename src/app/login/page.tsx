"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import InstallPrompt from "@/components/InstallPrompt";
import {
  checkBiometry,
  authenticateWithBiometry,
  getBiometricToken,
  saveBiometricToken,
  clearBiometricToken,
  isNative,
  type BiometryInfo,
} from "@/lib/native";

function biometryLabel(info: BiometryInfo): string {
  if (info.biometryType === "faceId") return "Face ID";
  if (info.biometryType === "touchId") return "Touch ID";
  if (info.biometryType === "fingerprint") return "Fingerprint";
  return "Biometric";
}

function biometryIcon(info: BiometryInfo): string {
  if (info.biometryType === "faceId") return "👤";
  if (info.biometryType === "touchId" || info.biometryType === "fingerprint") return "👆";
  return "🔐";
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [biometryInfo, setBiometryInfo] = useState<BiometryInfo | null>(null);
  const [storedToken, setStoredToken] = useState<string | null>(null);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const doBiometricLogin = useCallback(async (token: string) => {
    setBiometricLoading(true);
    setError("");
    const authed = await authenticateWithBiometry("Sign in to TruckAudit");
    if (!authed) { setBiometricLoading(false); return; }
    try {
      const res = await fetch("/api/auth/biometric-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(data.role === "owner" ? "/owner" : "/driver");
        return;
      }
      await clearBiometricToken();
      setStoredToken(null);
      setError("Biometric session expired. Please sign in with your password.");
    } catch {
      setError("Sign in failed. Try again.");
    }
    setBiometricLoading(false);
  }, [router]);

  useEffect(() => {
    async function initBiometric() {
      const info = await checkBiometry();
      setBiometryInfo(info);
      if (info.available) {
        const token = await getBiometricToken();
        setStoredToken(token);
        if (token) doBiometricLogin(token);
      }
    }
    initBiometric();
  }, [doBiometricLogin]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!username.trim() || !password) { setError("Enter username and password"); return; }
    setLoading(true);
    setError("");
    setLocked(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 423) {
          const mins = data.secsRemaining ? Math.ceil(data.secsRemaining / 60) : "?";
          setError(`Account locked. Try again in ${mins} min or contact your manager.`);
          setLocked(true);
        } else if (data.attemptsLeft != null && data.attemptsLeft <= 2) {
          setError(`Wrong password. ${data.attemptsLeft} attempt${data.attemptsLeft !== 1 ? "s" : ""} left before lockout.`);
        } else {
          setError("Invalid username or password");
        }
        setPassword("");
        setLoading(false);
        return;
      }
      const data = await res.json();
      const redirectPath = data.role === "owner" ? "/owner" : "/driver";
      if (isNative() && biometryInfo?.available && !storedToken) {
        setPendingPath(redirectPath);
        setShowOffer(true);
        setLoading(false);
        return;
      }
      router.push(redirectPath);
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    try {
      const platform = typeof window !== "undefined"
        ? (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor?.getPlatform?.() ?? null
        : null;
      const res = await fetch("/api/auth/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      if (res.ok) {
        const { token } = await res.json();
        await saveBiometricToken(token);
      }
    } catch { /* non-fatal */ }
    router.push(pendingPath!);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      {showOffer && biometryInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="w-full bg-white rounded-t-2xl p-6 pb-10 max-w-sm mx-auto">
            <div className="text-5xl text-center mb-4">{biometryIcon(biometryInfo)}</div>
            <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
              Enable {biometryLabel(biometryInfo)}?
            </h2>
            <p className="text-slate-500 text-sm text-center mb-6">
              Sign in instantly without typing your password next time.
            </p>
            <button onClick={handleEnableBiometric} className="w-full h-12 rounded-xl bg-amber-600 text-white font-bold text-lg mb-3 active:bg-amber-700">
              Enable {biometryLabel(biometryInfo)}
            </button>
            <button onClick={() => router.push(pendingPath!)} className="w-full h-12 rounded-xl text-slate-500 font-medium text-base">
              Not Now
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="TruckAudit" className="w-24 h-24 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-slate-900">TruckAudit</h1>
          <p className="text-slate-500 mt-1">Sign in to your account</p>
        </div>

        {biometryInfo?.available && storedToken && (
          <button
            type="button"
            onClick={() => doBiometricLogin(storedToken)}
            disabled={biometricLoading}
            className="w-full h-14 rounded-xl border-2 border-amber-600 text-amber-700 font-bold text-lg flex items-center justify-center gap-2 mb-5 disabled:opacity-50"
          >
            {biometricLoading ? (
              <span className="animate-pulse">Authenticating…</span>
            ) : (
              <><span className="text-2xl">{biometryIcon(biometryInfo)}</span>Sign in with {biometryLabel(biometryInfo)}</>
            )}
          </button>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              placeholder="e.g. john.smith"
              className="w-full h-12 rounded-xl border border-slate-300 px-4 text-slate-800 text-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="••••••••"
              className="w-full h-12 rounded-xl border border-slate-300 px-4 text-slate-800 text-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          {error && (
            <p className={`text-center text-sm font-medium ${locked ? "text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" : "text-red-500"}`}>
              {locked ? "🔒 " : ""}{error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full h-12 rounded-xl bg-amber-600 text-white text-lg font-bold disabled:opacity-40 active:bg-amber-700 transition-colors mt-2"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="mt-4"><InstallPrompt /></div>

        <p className="text-center text-sm text-slate-500 mt-5">
          New company?{" "}
          <a href="/signup" className="text-amber-600 font-medium">Create free account →</a>
        </p>
      </div>

      <footer className="mt-8 text-center text-sm text-slate-400 pb-4">
        <p>&copy; 2026 TruckAudit. All rights reserved.</p>
        <span className="mx-1">·</span>
        <a href="/terms" className="text-slate-500 hover:text-amber-600 underline">Terms</a>
        <span className="mx-1">·</span>
        <a href="/privacy" className="text-slate-500 hover:text-amber-600 underline">Privacy</a>
      </footer>
    </div>
  );
}
