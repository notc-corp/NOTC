import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.truckaudit.app",
  appName: "TruckAudit",
  webDir: "out",
  server: {
    // In production, point to the deployed URL
    // In dev, use the local server
    url: process.env.CAPACITOR_SERVER_URL || "http://localhost:3000",
    cleartext: true,
  },
  plugins: {
    Camera: {
      permissions: ["camera", "photos"],
    },
    Geolocation: {
      permissions: ["location"],
    },
    BiometricAuth: {
      // iOS: NSFaceIDUsageDescription added to Info.plist by plugin automatically
      // Android: USE_BIOMETRIC permission added to AndroidManifest.xml by plugin
    },
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#ffffff",
  },
  android: {
    backgroundColor: "#ffffff",
    allowMixedContent: true,
  },
};

export default config;
