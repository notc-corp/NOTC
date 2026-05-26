"use client";

import { useState, useEffect, useCallback } from "react";

interface Truck {
  id: number;
  number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  licensePlate: string | null;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = { number: "", make: "", model: "", year: "", vin: "", licensePlate: "" };

export default function TrucksPage() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/trucks");
    if (res.ok) setTrucks(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (truck: Truck) => {
    setEditId(truck.id);
    setForm({
      number: truck.number,
      make: truck.make || "",
      model: truck.model || "",
      year: truck.year ? String(truck.year) : "",
      vin: truck.vin || "",
      licensePlate: truck.licensePlate || "",
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(emptyForm);
    setError("");
  };

  const save = async () => {
    if (!form.number.trim()) { setError("Truck number is required"); return; }
    setSaving(true);
    setError("");

    const url = editId ? `/api/trucks/${editId}` : "/api/trucks";
    const method = editId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, year: form.year || null }),
    });

    if (res.ok) {
      setForm(emptyForm);
      setEditId(null);
      await load();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save");
    }
    setSaving(false);
  };

  const deactivate = async (id: number) => {
    if (!confirm("Deactivate this truck?")) return;
    await fetch(`/api/trucks/${id}`, { method: "DELETE" });
    await load();
  };

  const activeTrucks = trucks.filter((t) => t.isActive);
  const inactiveTrucks = trucks.filter((t) => !t.isActive);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Trucks</h1>

      {/* Add / Edit form */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <h2 className="font-semibold text-lg mb-3">{editId ? "Edit Truck" : "Add Truck"}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Truck Number *</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Truck 01"
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Freightliner"
              value={form.make}
              onChange={(e) => setForm({ ...form, make: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Cascadia"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. 2022"
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. ABC-1234"
              value={form.licensePlate}
              onChange={(e) => setForm({ ...form, licensePlate: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              placeholder="17-character VIN"
              value={form.vin}
              onChange={(e) => setForm({ ...form, vin: e.target.value })}
            />
          </div>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button
            onClick={save}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : editId ? "Save Changes" : "Add Truck"}
          </button>
          {editId && (
            <button
              onClick={cancelEdit}
              className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Active trucks */}
      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : (
        <>
          <div className="space-y-3">
            {activeTrucks.length === 0 && (
              <p className="text-gray-500 text-sm">No trucks yet. Add one above.</p>
            )}
            {activeTrucks.map((truck) => (
              <div key={truck.id} className="bg-white rounded-xl shadow p-4 flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-base">{truck.number}</div>
                  {(truck.make || truck.model || truck.year) && (
                    <div className="text-sm text-gray-600">
                      {[truck.year, truck.make, truck.model].filter(Boolean).join(" ")}
                    </div>
                  )}
                  {truck.licensePlate && (
                    <div className="text-xs text-gray-500 mt-0.5">Plate: {truck.licensePlate}</div>
                  )}
                  {truck.vin && (
                    <div className="text-xs text-gray-400 font-mono mt-0.5">VIN: {truck.vin}</div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(truck)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deactivate(truck.id)}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            ))}
          </div>

          {inactiveTrucks.length > 0 && (
            <details className="mt-6">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                Inactive trucks ({inactiveTrucks.length})
              </summary>
              <div className="space-y-2 mt-2">
                {inactiveTrucks.map((truck) => (
                  <div key={truck.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between opacity-60">
                    <div>
                      <div className="font-medium text-sm">{truck.number}</div>
                      {(truck.make || truck.model) && (
                        <div className="text-xs text-gray-500">{[truck.make, truck.model].filter(Boolean).join(" ")}</div>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        await fetch(`/api/trucks/${truck.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ isActive: true }),
                        });
                        load();
                      }}
                      className="text-xs text-green-600 hover:underline"
                    >
                      Reactivate
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
