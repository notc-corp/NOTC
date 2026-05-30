"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface Downtime {
  id: number;
  startedAt: string;
}

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<{ name: string; role: string; autoLogoutMidnight?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [downtime, setDowntime] = useState<Downtime | null>(null);
  const [, setDowntimeTick] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const midnightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkDowntime = useCallback(() => {
    fetch("/api/downtime").then(r => r.json()).then(d => setDowntime(d.downtime));
  }, []);

  const endDowntime = async () => {
    await fetch("/api/downtime", { method: "PATCH" });
    setDowntime(null);
  };

  const getElapsed = (startedAt: string) => {
    const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  };

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }, [router]);

  // Schedule auto-logout at midnight
  const scheduleMidnightLogout = useCallback((enabled: boolean) => {
    if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
    if (!enabled) return;

    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // next midnight in local time
    const msUntilMidnight = midnight.getTime() - now.getTime();

    midnightTimerRef.current = setTimeout(() => {
      handleLogout();
    }, msUntilMidnight);
  }, [handleLogout]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user || data.user.role !== "driver") {
          router.push("/");
        } else {
          setUser(data.user);
          checkDowntime();
          scheduleMidnightLogout(data.user.autoLogoutMidnight ?? true);
        }
        setLoading(false);
      });

    return () => {
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
    };
  }, [router, checkDowntime, scheduleMidnightLogout]);

  // Refresh downtime check when navigating back to driver pages
  useEffect(() => { checkDowntime(); }, [pathname, checkDowntime]);

  // Tick every second to update elapsed time display
  useEffect(() => {
    if (!downtime) return;
    const t = setInterval(() => setDowntimeTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [downtime]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-slate-800 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="bg-amber-600 border-b border-amber-700 px-4 py-3 flex items-center justify-between">
        {pathname === "/driver" ? (
          <Link href="/driver" className="flex items-center gap-2 text-xl font-bold text-white">
            <img src="/logo.png" alt="" className="w-8 h-8" />
            TruckAudit
          </Link>
        ) : (
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-white font-semibold text-lg active:opacity-70 -ml-1 px-1"
          >
            <span className="text-2xl leading-none">‹</span>
            <span className="text-base">Back</span>
          </button>
        )}
        <div className="flex items-center gap-3">
          <span className="text-amber-100 text-sm">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm bg-amber-700 text-white px-3 py-1.5 rounded-lg active:bg-amber-800"
          >
            Log Out
          </button>
        </div>
      </header>
      {/* Downtime banner */}
      {downtime && (
        <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between text-sm">
          <span>
            🚫 <strong>Out of Service</strong> · {getElapsed(downtime.startedAt)}
          </span>
          <button
            onClick={endDowntime}
            className="bg-white text-red-600 font-bold text-xs px-3 py-1 rounded-full active:bg-red-50"
          >
            ▶ Resume
          </button>
        </div>
      )}

      <main className="p-4 max-w-lg mx-auto pb-24">{children}</main>

      {/* FAB — Report Issue */}
      {pathname !== "/driver/report-issue" && (
        <Link
          href="/driver/report-issue"
          className="fixed bottom-6 right-4 w-14 h-14 bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl active:bg-red-700 z-50"
          title="Report Issue"
        >
          🔧
        </Link>
      )}

      <footer className="text-center text-sm text-slate-400 py-6">
        <p>&copy; 2026 TruckAudit. All rights reserved.</p>
        <a href="/privacy" className="text-slate-500 hover:text-amber-600 underline">
          Privacy Policy
        </a>
      </footer>
    </div>
  );
}
