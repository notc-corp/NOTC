import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import bcryptjs from "bcryptjs";

export interface SessionData {
  userId: number;
  role: "owner" | "driver";
  name: string;
}

const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    "this-is-a-dev-secret-change-in-production-must-be-32-chars!!",
  cookieName: "audit-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session;
}

export async function hashPin(pin: string): Promise<string> {
  return bcryptjs.hash(pin, 10);
}

export async function verifyPin(
  pin: string,
  hash: string
): Promise<boolean> {
  return bcryptjs.compare(pin, hash);
}
