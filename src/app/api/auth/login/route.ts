import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { getSession, verifyPassword } from "@/lib/auth";
import { notifyLoginBlocked } from "@/lib/notifications";
import { eq } from "drizzle-orm";

const MAX_ATTEMPTS = 5;
const LOCK_FIRST_MINS = 3;
const LOCK_ESCALATED_MINS = 60;

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const [matchedUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.trim().toLowerCase()));

    if (!matchedUser || !matchedUser.isActive) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    // Check if currently locked
    if (matchedUser.lockedUntil) {
      const lockedUntilDate = new Date(matchedUser.lockedUntil);
      if (lockedUntilDate > new Date()) {
        const secsRemaining = Math.ceil((lockedUntilDate.getTime() - Date.now()) / 1000);
        return NextResponse.json(
          { error: "Account locked", secsRemaining },
          { status: 423 }
        );
      }
    }

    const valid = await verifyPassword(password, matchedUser.pinHash);

    if (!valid) {
      const newAttempts = (matchedUser.failedAttempts ?? 0) + 1;

      if (newAttempts >= MAX_ATTEMPTS) {
        const isEscalated = (matchedUser.lockLevel ?? 0) >= 1;
        const durationMins = isEscalated ? LOCK_ESCALATED_MINS : LOCK_FIRST_MINS;
        const lockedUntil = new Date(Date.now() + durationMins * 60 * 1000).toISOString();

        await db.update(users).set({
          failedAttempts: 0,
          lockedUntil,
          lockLevel: (matchedUser.lockLevel ?? 0) + 1,
        }).where(eq(users.id, matchedUser.id));

        notifyLoginBlocked({
          companyId: matchedUser.companyId,
          driverName: matchedUser.name,
          username: matchedUser.username ?? username,
          lockDurationMins: durationMins,
        }).catch(() => {});

        return NextResponse.json(
          { error: "Account locked", secsRemaining: durationMins * 60 },
          { status: 423 }
        );
      }

      await db.update(users).set({ failedAttempts: newAttempts }).where(eq(users.id, matchedUser.id));

      const attemptsLeft = MAX_ATTEMPTS - newAttempts;
      return NextResponse.json(
        { error: "Invalid username or password", attemptsLeft },
        { status: 401 }
      );
    }

    // Successful login — reset counters
    await db.update(users).set({ failedAttempts: 0, lockedUntil: null }).where(eq(users.id, matchedUser.id));

    const session = await getSession();
    session.userId = matchedUser.id;
    session.role = matchedUser.role;
    session.name = matchedUser.name;
    session.companyId = matchedUser.companyId ?? undefined;
    await session.save();

    return NextResponse.json({
      userId: matchedUser.id,
      role: matchedUser.role,
      name: matchedUser.name,
      companyId: matchedUser.companyId,
    });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
