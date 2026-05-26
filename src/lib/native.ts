// Capacitor native plugin wrappers with browser fallback.
// Use these instead of calling navigator.camera / navigator.geolocation directly.

export const isNative = (): boolean => {
  return typeof window !== "undefined" && !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
};

export const getPlatform = (): "ios" | "android" | "web" => {
  if (typeof window === "undefined") return "web";
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  if (!cap?.getPlatform) return "web";
  const p = cap.getPlatform();
  if (p === "ios") return "ios";
  if (p === "android") return "android";
  return "web";
};

// Returns a photo as a base64 data URL.
// On native: uses Capacitor Camera plugin.
// On web: opens file picker.
export async function takePhoto(): Promise<string | null> {
  if (isNative()) {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      quality: 80,
    });
    return photo.dataUrl ?? null;
  }

  // Browser fallback — open file picker
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
  speed?: number;
  heading?: number;
}

export async function getCurrentPosition(): Promise<GeoPosition> {
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed ?? undefined,
      heading: pos.coords.heading ?? undefined,
    };
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed ?? undefined,
        heading: pos.coords.heading ?? undefined,
      }),
      reject,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
