"use client";

import { useEffect, useState } from "react";

interface Defect {
  id: number;
  driverId: number;
  tripId: number | null;
  description: string;
  severity: "minor" | "major" | "out_of_service";
  photoPath: string | null;
  resolvedAt: string | null;
  resolvedBy: number | null;
  createdAt: string;
  driverName?: string;
}

interface DefectNote {
  id: number;
  defectId: number;
  authorId: number;
  text: string;
  createdAt: string;
  updatedAt: string | null;
}

interface Downtime {
  id: number;
  driverId: number;
  tripId: number | null;
  reason: string | null;
  startedAt: string;
  endedAt: string | null;
}

const SEVERITY_STYLE = {
  minor:          { label: "Minor",          bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-800", icon: "⚠️" },
  major:          { label: "Major",          bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-800", icon: "🔴" },
  out_of_service: { label: "Out of Service", bg: "bg-red-50",    border: "border-red-300",    text: "text-red-800",   icon: "🚫" },
};

function getDuration(start: string, end: string | null) {
  const diff = Math.floor(((end ? new Date(end) : new Date()).getTime() - new Date(start).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function NotesPanel({ defectId, defectResolved }: { defectId: number; defectResolved: boolean }) {
  const [notes, setNotes] = useState<DefectNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const loadNotes = async () => {
    const res = await fetch(`/api/defects/${defectId}/notes`);
    const data = await res.json();
    setNotes(data.notes || []);
    setLoading(false);
  };

  useEffect(() => { loadNotes(); }, [defectId]);

  const addNote = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    await fetch(`/api/defects/${defectId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText.trim() }),
    });
    setNewText("");
    await loadNotes();
    setSaving(false);
  };

  const saveEdit = async (noteId: number) => {
    if (!editText.trim()) return;
    setSaving(true);
    await fetch(`/api/defects/${defectId}/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editText.trim() }),
    });
    setEditingId(null);
    setEditText("");
    await loadNotes();
    setSaving(false);
  };

  const deleteNote = async (noteId: number) => {
    if (!confirm("Delete this note?")) return;
    await fetch(`/api/defects/${defectId}/notes/${noteId}`, { method: "DELETE" });
    await loadNotes();
  };

  return (
    <div className="mt-2 pt-3 border-t border-slate-200 space-y-3">
      {loading ? (
        <p className="text-xs text-slate-400">Loading notes...</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No notes yet</p>
      ) : (
        <div className="space-y-2">
          {notes.map(note => (
            <div key={note.id} className="bg-white rounded-lg border border-slate-200 p-3">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={2}
                    autoFocus
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:border-amber-500 focus:outline-none resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setEditingId(null); setEditText(""); }}
                      className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(note.id)}
                      disabled={saving}
                      className="text-xs px-2.5 py-1 rounded bg-amber-600 text-white font-medium disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-800">{note.text}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-slate-400">
                      {new Date(note.createdAt).toLocaleString()}
                      {note.updatedAt && " · edited"}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { setEditingId(note.id); setEditText(note.text); }}
                        className="text-xs text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <textarea
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder={defectResolved ? "Add follow-up note..." : "Describe repair, parts replaced, who fixed it..."}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white focus:border-amber-500 focus:outline-none resize-none"
        />
        <div className="flex justify-end">
          <button
            onClick={addNote}
            disabled={saving || !newText.trim()}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium active:bg-amber-700 disabled:opacity-40"
          >
            + Add Note
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DefectsPage() {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [downtimes, setDowntimes] = useState<Downtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "out_of_service">("all");
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [notesOpenId, setNotesOpenId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const [defRes, dtRes] = await Promise.all([
      fetch("/api/defects"),
      fetch("/api/downtime/all"),
    ]);
    const defData = await defRes.json();
    const dtData = await dtRes.json();
    setDefects(defData.defects || []);
    setDowntimes(dtData.downtimes || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resolveDefect = async (id: number) => {
    setResolvingId(id);
    await fetch(`/api/defects/${id}/resolve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await load();
    setResolvingId(null);
  };

  const filtered = defects.filter(d => {
    if (filter === "open") return !d.resolvedAt;
    if (filter === "out_of_service") return d.severity === "out_of_service";
    return true;
  });

  const openCount = defects.filter(d => !d.resolvedAt).length;
  const outOfServiceCount = defects.filter(d => d.severity === "out_of_service" && !d.resolvedAt).length;
  const activeDowntime = downtimes.filter(d => !d.endedAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">🔧 Issues & Downtime</h1>
        <button onClick={load} className="text-sm text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg bg-white border border-slate-200">
          ↻ Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-slate-800">{openCount}</p>
          <p className="text-sm text-slate-500 mt-1">Open Issues</p>
        </div>
        <div className={`rounded-xl border p-4 text-center shadow-sm ${outOfServiceCount > 0 ? "bg-red-50 border-red-300" : "bg-white border-slate-200"}`}>
          <p className={`text-3xl font-bold ${outOfServiceCount > 0 ? "text-red-700" : "text-slate-800"}`}>{outOfServiceCount}</p>
          <p className="text-sm text-slate-500 mt-1">Out of Service</p>
        </div>
        <div className={`rounded-xl border p-4 text-center shadow-sm ${activeDowntime.length > 0 ? "bg-red-50 border-red-300" : "bg-white border-slate-200"}`}>
          <p className={`text-3xl font-bold ${activeDowntime.length > 0 ? "text-red-700" : "text-slate-800"}`}>{activeDowntime.length}</p>
          <p className="text-sm text-slate-500 mt-1">Active Downtime</p>
        </div>
      </div>

      {/* Active downtime alerts */}
      {activeDowntime.length > 0 && (
        <div className="space-y-2">
          {activeDowntime.map(dt => (
            <div key={dt.id} className="bg-red-600 text-white rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-bold">🚫 Active Downtime — Driver #{dt.driverId}</p>
                <p className="text-sm text-red-100 mt-0.5">
                  {dt.reason || "No reason given"} · {getDuration(dt.startedAt, null)} elapsed
                </p>
              </div>
              <span className="text-red-200 text-sm">{new Date(dt.startedAt).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "open", "out_of_service"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? "bg-amber-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f === "all" ? "All" : f === "open" ? "Open" : "Out of Service"}
          </button>
        ))}
      </div>

      {/* Defects list */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No issues found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => {
            const s = SEVERITY_STYLE[d.severity];
            const notesOpen = notesOpenId === d.id;
            return (
              <div key={d.id} className={`rounded-xl border ${s.border} ${s.bg} p-4 space-y-2`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{s.icon}</span>
                    <div>
                      <span className={`text-xs font-bold uppercase tracking-wide ${s.text}`}>{s.label}</span>
                      {d.resolvedAt && (
                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Resolved</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {new Date(d.createdAt).toLocaleString()}
                  </span>
                </div>

                <p className="text-slate-800 text-sm">{d.description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Driver #{d.driverId}{d.tripId ? ` · Trip #${d.tripId}` : ""}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNotesOpenId(notesOpen ? null : d.id)}
                      className={`text-xs border px-3 py-1.5 rounded-lg font-medium active:bg-slate-50 ${
                        notesOpen
                          ? "bg-amber-50 border-amber-300 text-amber-700"
                          : "bg-white border-slate-300 text-slate-600"
                      }`}
                    >
                      📝 Notes
                    </button>
                    {!d.resolvedAt && (
                      <button
                        onClick={() => resolveDefect(d.id)}
                        disabled={resolvingId === d.id}
                        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium active:bg-green-700 disabled:opacity-40"
                      >
                        ✓ Mark Resolved
                      </button>
                    )}
                  </div>
                </div>

                {notesOpen && (
                  <NotesPanel defectId={d.id} defectResolved={!!d.resolvedAt} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Downtime history */}
      {downtimes.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-3">Downtime History</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Driver</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Reason</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Start</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Duration</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {downtimes.map(dt => (
                  <tr key={dt.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-700">#{dt.driverId}</td>
                    <td className="px-4 py-3 text-slate-600">{dt.reason || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(dt.startedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{getDuration(dt.startedAt, dt.endedAt)}</td>
                    <td className="px-4 py-3">
                      {dt.endedAt
                        ? <span className="text-green-600 font-medium">Ended</span>
                        : <span className="text-red-600 font-bold animate-pulse">● Active</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
