"use client";

import { useEffect, useState } from "react";

interface Driver {
  id: number;
  name: string;
  username: string | null;
  truckNumber: string | null;
  phone: string | null;
  isActive: boolean;
  lockedUntil: string | null;
  failedAttempts: number;
  autoLogoutMidnight: boolean;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    truckNumber: "",
    phone: "",
    autoLogoutMidnight: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [unlocking, setUnlocking] = useState<number | null>(null);

  const loadDrivers = () => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        setDrivers(data.users || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const resetForm = () => {
    setForm({ name: "", username: "", password: "", truckNumber: "", phone: "", autoLogoutMidnight: true });
    setShowForm(false);
    setEditingId(null);
    setShowPassword(false);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.username || (!editingId && !form.password)) return;

    if (editingId) {
      const body: Record<string, string | boolean> = {
        name: form.name,
        username: form.username,
        truckNumber: form.truckNumber,
        phone: form.phone,
        autoLogoutMidnight: form.autoLogoutMidnight,
      };
      if (form.password) body.password = form.password;

      await fetch(`/api/users/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }

    resetForm();
    loadDrivers();
  };

  const handleEdit = (driver: Driver) => {
    setForm({
      name: driver.name,
      username: driver.username || "",
      password: "",
      truckNumber: driver.truckNumber || "",
      phone: driver.phone || "",
      autoLogoutMidnight: driver.autoLogoutMidnight,
    });
    setEditingId(driver.id);
    setShowForm(true);
  };

  const handleToggleActive = async (driver: Driver) => {
    await fetch(`/api/users/${driver.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !driver.isActive }),
    });
    loadDrivers();
  };

  const handleUnlock = async (driver: Driver) => {
    setUnlocking(driver.id);
    await fetch(`/api/users/${driver.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unlock: true }),
    });
    setUnlocking(null);
    loadDrivers();
  };

  const isLocked = (driver: Driver) =>
    !!driver.lockedUntil && new Date(driver.lockedUntil) > new Date();

  const lockTimeRemaining = (lockedUntil: string) => {
    const secsLeft = Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000);
    if (secsLeft <= 0) return "";
    if (secsLeft < 60) return `${secsLeft}s`;
    if (secsLeft < 3600) return `${Math.ceil(secsLeft / 60)}m`;
    return `${Math.ceil(secsLeft / 3600)}h`;
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Drivers</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg font-medium active:bg-amber-700"
        >
          {showForm ? "Cancel" : "+ Add Driver"}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-4 space-y-3 border border-slate-200 shadow-sm">
          <h2 className="font-semibold text-lg text-slate-900">
            {editingId ? "Edit Driver" : "New Driver"}
          </h2>
          <input
            type="text"
            placeholder="Driver full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full h-12 rounded-lg bg-white px-4 text-slate-800 border border-slate-300 focus:border-amber-600 focus:outline-none"
          />
          <input
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="Username (e.g. john.smith)"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s+/g, ".") })}
            className="w-full h-12 rounded-lg bg-white px-4 text-slate-800 border border-slate-300 focus:border-amber-600 focus:outline-none"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={editingId ? "New password (leave blank to keep)" : "Password (min 4 characters)"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full h-12 rounded-lg bg-white px-4 pr-12 text-slate-800 border border-slate-300 focus:border-amber-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 active:text-amber-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <input
            type="text"
            placeholder="Truck number (optional)"
            value={form.truckNumber}
            onChange={(e) => setForm({ ...form, truckNumber: e.target.value })}
            className="w-full h-12 rounded-lg bg-white px-4 text-slate-800 border border-slate-300 focus:border-amber-600 focus:outline-none"
          />
          <input
            type="tel"
            placeholder="Phone for SMS uploads (optional)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full h-12 rounded-lg bg-white px-4 text-slate-800 border border-slate-300 focus:border-amber-600 focus:outline-none"
          />
          <label className="flex items-center justify-between px-1 cursor-pointer select-none">
            <div>
              <p className="text-sm font-medium text-slate-700">Auto-logout at midnight</p>
              <p className="text-xs text-slate-400">Session ends automatically at 00:00</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, autoLogoutMidnight: !f.autoLogoutMidnight }))}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.autoLogoutMidnight ? "bg-amber-600" : "bg-slate-300"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.autoLogoutMidnight ? "translate-x-5" : ""}`} />
            </button>
          </label>
          <button
            onClick={handleSubmit}
            disabled={!form.name || !form.username || (!editingId && !form.password)}
            className="w-full h-12 rounded-lg bg-green-600 text-white font-bold disabled:opacity-40 active:bg-green-700"
          >
            {editingId ? "Save Changes" : "Add Driver"}
          </button>
        </div>
      )}

      {/* Driver List */}
      <div className="space-y-3">
        {drivers.length === 0 ? (
          <p className="text-slate-500 text-center py-8">
            No drivers yet. Add your first driver above.
          </p>
        ) : (
          drivers.map((driver) => {
            const locked = isLocked(driver);
            return (
              <div
                key={driver.id}
                className={`bg-white rounded-xl p-4 border shadow-sm ${
                  locked
                    ? "border-red-300 bg-red-50"
                    : !driver.isActive
                    ? "border-slate-200 opacity-50"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-lg text-slate-800">{driver.name}</p>
                      {locked && (
                        <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-medium">
                          🔒 {lockTimeRemaining(driver.lockedUntil!)}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 text-sm text-slate-500 mt-0.5">
                      {driver.username && <span>@{driver.username}</span>}
                      {driver.truckNumber && <span>🚛 {driver.truckNumber}</span>}
                      {driver.phone && <span>📱 {driver.phone}</span>}
                      {!driver.isActive && <span className="text-red-500">Inactive</span>}
                      {!locked && driver.failedAttempts > 0 && (
                        <span className="text-amber-600">⚠️ {driver.failedAttempts} bad attempt{driver.failedAttempts > 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {locked ? (
                      <button
                        onClick={() => handleUnlock(driver)}
                        disabled={unlocking === driver.id}
                        className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium active:bg-green-700 disabled:opacity-50"
                      >
                        {unlocking === driver.id ? "..." : "🔓 Unlock"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEdit(driver)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm active:bg-slate-200 border border-slate-200"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleActive(driver)}
                      className={`px-3 py-1.5 rounded-lg text-sm text-white ${
                        driver.isActive
                          ? "bg-red-600 active:bg-red-700"
                          : "bg-green-600 active:bg-green-700"
                      }`}
                    >
                      {driver.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
