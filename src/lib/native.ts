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

export interface BiometryInfo {
  available: boolean;
  biometryType: "none" | "touchId" | "faceId" | "fingerprint" | "face" | "iris";
}

export async function checkBiometry(): Promise<BiometryInfo> {
  if (!isNative()) return { available: false, biometryType: "none" };
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    const result = await BiometricAuth.checkBiometry();
    const typeMap: Record<number, BiometryInfo["biometryType"]> = {
      0: "none", 1: "touchId", 2: "faceId", 3: "fingerprint", 4: "face", 5: "iris",
    };
    return { available: result.isAvailable, biometryType: typeMap[result.biometryType] ?? "none" };
  } catch {
    return { available: false, biometryType: "none" };
  }
}

export async function authenticateWithBiometry(reason: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    await BiometricAuth.authenticate({ reason, cancelTitle: "Cancel", allowDeviceCredential: false });
    return true;
  } catch {
    return false;
  }
}

export async function getBiometricToken(): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: "biometric_token" });
    return value;
  } catch {
    return null;
  }
}

export async function saveBiometricToken(token: string): Promise<void> {
  if (!isNative()) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key: "biometric_token", value: token });
  } catch { /* ignore */ }
}

export async function clearBiometricToken(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.remove({ key: "biometric_token" });
  } catch { /* ignore */ }
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
