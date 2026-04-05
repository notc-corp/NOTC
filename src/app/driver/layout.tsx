"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user || data.user.role !== "driver") {
          router.push("/");
        } else {
          setUser(data.user);
        }
        setLoading(false);
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

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
        <Link href="/driver" className="flex items-center gap-2 text-xl font-bold text-white">
          <img src="/logo.png" alt="" className="w-8 h-8" />
          TruckAudit
        </Link>
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
      <main className="p-4 max-w-lg mx-auto">{children}</main>
      <footer className="text-center text-sm text-slate-400 py-6">
        <p>&copy; 2026 TruckAudit. All rights reserved.</p>
        <a href="/privacy" className="text-slate-500 hover:text-amber-600 underline">
          Privacy Policy
        </a>
      </footer>
    </div>
  );
}
