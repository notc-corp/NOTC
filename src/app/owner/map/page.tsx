"use client";

import { useEffect, useState, useCallback } from "react";
import Map, { Marker, Source, Layer, Popup } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface Trip {
  id: number;
  driverId: number;
  status: string;
  startedAt: string;
}

interface Point {
  id: number;
  tripId: number;
  driverId: number;
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
}

interface TripTrack {
  trip: Trip;
  points: Point[];
  driverName: string;
}

interface Driver { id: number; name: string; }

const COLORS = ["#e94560", "#0f3460", "#16a34a", "#ea580c", "#7c3aed"];

function speedColor(speed: number | null): string {
  if (speed == null) return "#64748b";
  if (speed < 45) return "#16a34a";
  if (speed < 65) return "#f59e0b";
  return "#dc2626";
}

export default function MapPage() {
  const [tracks, setTracks] = useState<TripTrack[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<number | null>(null);
  const [popup, setPopup] = useState<Point | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState({
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 4,
  });

  const load = useCallback(async () => {
    const [tripsRes, driversRes] = await Promise.all([
      fetch("/api/trips").then(r => r.json()),
      fetch("/api/users").then(r => r.json()),
    ]);
    const allTrips: Trip[] = tripsRes.trips || [];
    const drivers: Driver[] = driversRes.users || [];

    const trackData = await Promise.all(
      allTrips.map(async (t) => {
        const res = await fetch(`/api/trips/${t.id}/track`);
        const data = await res.json();
        const driver = drivers.find(d => d.id === t.driverId);
        return { trip: t, points: data.points || [], driverName: driver?.name || "Unknown" };
      })
    );

    setTracks(trackData.filter(t => t.points.length > 0));

    // Center map on most recent active trip
    const active = trackData.find(t => t.trip.status === "active" && t.points.length > 0);
    if (active) {
      const last = active.points[active.points.length - 1];
      setViewState(v => ({ ...v, longitude: last.lng, latitude: last.lat, zoom: 8 }));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [load]);

  const selectedTrack = selectedTrip != null ? tracks.find(t => t.trip.id === selectedTrip) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Fleet Map</h1>
        <span className="text-sm text-slate-500">Auto-refresh every 30s</span>
      </div>

      {/* Trip selector */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedTrip(null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${selectedTrip == null ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-700"}`}
        >
          All trips
        </button>
        {tracks.map((t, i) => (
          <button
            key={t.trip.id}
            onClick={() => setSelectedTrip(t.trip.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${selectedTrip === t.trip.id ? "text-white" : "bg-white border border-slate-200 text-slate-700"}`}
            style={selectedTrip === t.trip.id ? { background: COLORS[i % COLORS.length] } : {}}
          >
            <span className={`inline-block w-2 h-2 rounded-full`} style={{ background: COLORS[i % COLORS.length] }} />
            {t.driverName}
            {t.trip.status === "active" && <span className="text-xs bg-green-100 text-green-700 px-1.5 rounded-full">LIVE</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center bg-slate-100 rounded-2xl text-slate-500">
          Loading map...
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200" style={{ height: "60vh" }}>
          <Map
            {...viewState}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onMove={(e: any) => setViewState(e.viewState)}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={MAPBOX_TOKEN}
          >
            {tracks
              .filter(t => selectedTrip == null || t.trip.id === selectedTrip)
              .map((t, i) => {
                const color = COLORS[i % COLORS.length];
                const pts = t.points;
                if (pts.length < 2) return null;

                const geojson = {
                  type: "Feature" as const,
                  geometry: {
                    type: "LineString" as const,
                    coordinates: pts.map(p => [p.lng, p.lat]),
                  },
                  properties: {},
                };

                const lineLayer = {
                  id: `route-${t.trip.id}`,
                  type: "line" as const,
                  source: `src-${t.trip.id}`,
                  paint: { "line-color": color, "line-width": 3, "line-opacity": 0.8 },
                };

                const last = pts[pts.length - 1];

                return (
                  <span key={t.trip.id}>
                    <Source id={`src-${t.trip.id}`} type="geojson" data={geojson}>
                      <Layer {...lineLayer} />
                    </Source>

                    {/* Start marker */}
                    <Marker longitude={pts[0].lng} latitude={pts[0].lat}>
                      <div className="w-3 h-3 rounded-full bg-white border-2" style={{ borderColor: color }} />
                    </Marker>

                    {/* Current / last position */}
                    <Marker
                      longitude={last.lng}
                      latitude={last.lat}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={(e: any) => { e.originalEvent?.stopPropagation(); setPopup(last); }}
                    >
                      <div
                        className="flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold shadow-lg cursor-pointer"
                        style={{ background: color }}
                        title={t.driverName}
                      >
                        🚛
                      </div>
                    </Marker>

                    {/* Stop markers — points with speed=0 for >0 duration */}
                    {pts.filter(p => (p.speed ?? 99) < 2).map(p => (
                      <Marker key={p.id} longitude={p.lng} latitude={p.lat}>
                        <div
                          className="w-2.5 h-2.5 rounded-full border border-white cursor-pointer"
                          style={{ background: speedColor(p.speed) }}
                          onClick={() => setPopup(p)}
                        />
                      </Marker>
                    ))}
                  </span>
                );
              })}

            {popup && (
              <Popup
                longitude={popup.lng}
                latitude={popup.lat}
                onClose={() => setPopup(null)}
                closeButton
              >
                <div className="text-sm space-y-1 p-1">
                  <p className="font-semibold text-slate-800">
                    {popup.speed != null ? `${Math.round(popup.speed)} mph` : "Stopped"}
                  </p>
                  <p className="text-slate-500">{new Date(popup.recordedAt).toLocaleTimeString()}</p>
                  {popup.heading != null && (
                    <p className="text-slate-500">Heading: {Math.round(popup.heading)}°</p>
                  )}
                </div>
              </Popup>
            )}
          </Map>
        </div>
      )}

      {/* Stats */}
      {selectedTrack && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
            <p className="text-2xl font-bold text-slate-800">{selectedTrack.points.length}</p>
            <p className="text-sm text-slate-500">GPS Points</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
            <p className="text-2xl font-bold text-slate-800">
              {selectedTrack.points.length > 0
                ? `${Math.round(Math.max(...selectedTrack.points.map(p => p.speed ?? 0)))} mph`
                : "—"}
            </p>
            <p className="text-sm text-slate-500">Top Speed</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
            <p className="text-2xl font-bold text-slate-800">
              {selectedTrack.points.filter(p => (p.speed ?? 99) < 2).length}
            </p>
            <p className="text-sm text-slate-500">Stops</p>
          </div>
        </div>
      )}
    </div>
  );
}
