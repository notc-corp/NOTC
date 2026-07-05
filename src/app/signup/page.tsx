"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ companyName: "", ownerName: "", username: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim() || !form.ownerName.trim() || !form.username.trim() || !form.password) {
      setError("Please fill in all fields");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords don't match");
      return;
    }
    if (form.password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: form.companyName,
        ownerName: form.ownerName,
        username: form.username,
        password: form.password,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Registration failed");
      setLoading(false);
      return;
    }
    router.push("/owner");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="TruckAudit" className="w-20 h-20 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-slate-500 mt-1 text-sm">30-day free trial · No credit card required</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company name</label>
            <input
              type="text"
              value={form.companyName}
              onChange={set("companyName")}
              placeholder="e.g. Maxim Trucking LLC"
              className="w-full h-12 rounded-xl border border-slate-300 px-4 text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              autoComplete="organization"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your full name</label>
            <input
              type="text"
              value={form.ownerName}
              onChange={set("ownerName")}
              placeholder="e.g. Alex Maximov"
              className="w-full h-12 rounded-xl border border-slate-300 px-4 text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={set("username")}
              placeholder="e.g. alex.maximov"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              className="w-full h-12 rounded-xl border border-slate-300 px-4 text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-400 mt-1">Letters, digits, dots, dashes. Used to log in.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder="4+ characters"
              autoComplete="new-password"
              className="w-full h-12 rounded-xl border border-slate-300 px-4 text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
            <input
              type="password"
              value={form.confirm}
              onChange={set("confirm")}
              placeholder="Repeat password"
              autoComplete="new-password"
              className="w-full h-12 rounded-xl border border-slate-300 px-4 text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-amber-600 text-white text-base font-bold disabled:opacity-40 active:bg-amber-700 transition-colors mt-2"
          >
            {loading ? "Creating account..." : "Create account — Free 30 days"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-amber-600 font-medium">
            Sign in
          </Link>
        </p>

        <p className="text-center text-xs text-slate-400 mt-4">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="underline">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
