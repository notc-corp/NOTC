"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/owner", label: "Dashboard", icon: "📊" },
  { href: "/owner/drivers", label: "Drivers", icon: "👤" },
  { href: "/owner/trips", label: "Trips", icon: "🚛" },
  { href: "/owner/expenses", label: "Expenses", icon: "💰" },
  { href: "/owner/reports", label: "Reports", icon: "📋" },
  { href: "/owner/inspections", label: "Inspections", icon: "✅" },
  { href: "/owner/map", label: "Fleet Map", icon: "🗺️" },
  { href: "/owner/defects", label: "Issues", icon: "🔧" },
  { href: "/owner/trucks", label: "Trucks", icon: "🚚" },
  { href: "/owner/salary", label: "Salary", icon: "💵" },
  { href: "/owner/trucks/accounting", label: "Accounting", icon: "📑" },
  { href: "/owner/settings", label: "Settings", icon: "⚙️" },
];

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user || data.user.role !== "owner") {
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
        <Link href="/owner" className="flex items-center gap-2 text-xl font-bold text-white">
          <img src="/logo.png" alt="" className="w-8 h-8" />
          TruckAudit
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-amber-100 text-sm">{user?.name} (Owner)</span>
          <button
            onClick={handleLogout}
            className="text-sm bg-amber-700 text-white px-3 py-1.5 rounded-lg active:bg-amber-800"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 px-4 py-2 flex gap-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              pathname === item.href
                ? "bg-amber-600 text-white"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <main className="p-4 max-w-6xl mx-auto">{children}</main>
      <footer className="text-center text-sm text-slate-400 py-6">
        <p>&copy; 2026 TruckAudit. All rights reserved.</p>
        <a href="/privacy" className="text-slate-500 hover:text-amber-600 underline">
          Privacy Policy
        </a>
      </footer>
    </div>
  );
}
