"use client";

import { useEffect, useState } from "react";

interface Driver {
  id: number;
  name: string;
  truckNumber: string | null;
  phone: string | null;
  isActive: boolean;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    pin: "",
    truckNumber: "",
    phone: "",
  });

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
    setForm({ name: "", pin: "", truckNumber: "", phone: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!form.name || (!editingId && !form.pin)) return;

    if (editingId) {
      const body: Record<string, string> = {
        name: form.name,
        truckNumber: form.truckNumber,
        phone: form.phone,
      };
      if (form.pin) body.pin = form.pin;

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
      pin: "",
      truckNumber: driver.truckNumber || "",
      phone: driver.phone || "",
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
            placeholder="Driver name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full h-12 rounded-lg bg-white px-4 text-slate-800 border border-slate-300 focus:border-amber-600 focus:outline-none"
          />
          <input
            type="text"
            placeholder={editingId ? "New PIN (leave blank to keep)" : "4-6 digit PIN"}
            value={form.pin}
            onChange={(e) =>
              setForm({
                ...form,
                pin: e.target.value.replace(/\D/g, "").slice(0, 6),
              })
            }
            className="w-full h-12 rounded-lg bg-white px-4 text-slate-800 border border-slate-300 focus:border-amber-600 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Truck number (optional)"
            value={form.truckNumber}
            onChange={(e) =>
              setForm({ ...form, truckNumber: e.target.value })
            }
            className="w-full h-12 rounded-lg bg-white px-4 text-slate-800 border border-slate-300 focus:border-amber-600 focus:outline-none"
          />
          <input
            type="tel"
            placeholder="Phone for SMS uploads (optional)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full h-12 rounded-lg bg-white px-4 text-slate-800 border border-slate-300 focus:border-amber-600 focus:outline-none"
          />
          <button
            onClick={handleSubmit}
            disabled={!form.name || (!editingId && !form.pin)}
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
          drivers.map((driver) => (
            <div
              key={driver.id}
              className={`bg-white rounded-xl p-4 flex items-center justify-between border border-slate-200 shadow-sm ${
                !driver.isActive ? "opacity-50" : ""
              }`}
            >
              <div>
                <p className="font-medium text-lg text-slate-800">{driver.name}</p>
                <div className="flex gap-3 text-sm text-slate-500">
                  {driver.truckNumber && <span>🚛 {driver.truckNumber}</span>}
                  {driver.phone && <span>📱 {driver.phone}</span>}
                  {!driver.isActive && (
                    <span className="text-red-500">Inactive</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(driver)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm active:bg-slate-200 border border-slate-200"
                >
                  Edit
                </button>
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
          ))
        )}
      </div>
    </div>
  );
}
