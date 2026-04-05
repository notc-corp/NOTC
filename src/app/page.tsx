"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError("");
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError("Enter at least 4 digits");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (!res.ok) {
        setError("Wrong PIN. Try again.");
        setPin("");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.role === "owner") {
        router.push("/owner");
      } else {
        router.push("/driver");
      }
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", ""];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="TruckAudit" className="w-24 h-24 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-slate-900">TruckAudit</h1>
          <p className="text-slate-500 mt-1">Enter your PIN</p>
        </div>

        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 ${
                i < pin.length
                  ? "bg-amber-600 border-amber-600"
                  : "border-slate-300"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-center mb-4 text-lg font-medium">
            {error}
          </p>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          {digits.map((digit, i) => {
            if (digit === "") {
              if (i === 9) return <div key={i} />;
              return (
                <button
                  key={i}
                  onClick={handleBackspace}
                  className="h-16 rounded-xl bg-slate-100 text-slate-800 text-2xl font-bold active:bg-slate-200 transition-colors flex items-center justify-center"
                >
                  ←
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => handleDigit(digit)}
                className="h-16 rounded-xl bg-slate-100 text-slate-800 text-2xl font-bold active:bg-slate-200 transition-colors"
              >
                {digit}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || pin.length < 4}
          className="w-full h-16 rounded-xl bg-amber-600 text-white text-xl font-bold disabled:opacity-40 active:bg-amber-700 transition-colors"
        >
          {loading ? "Checking..." : "GO"}
        </button>
      </div>

      <footer className="mt-8 text-center text-sm text-slate-400 pb-4">
        <p>&copy; 2026 TruckAudit. All rights reserved.</p>
        <a href="/privacy" className="text-slate-500 hover:text-amber-600 underline">
          Privacy Policy
        </a>
      </footer>
    </div>
  );
}
