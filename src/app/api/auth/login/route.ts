import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { getSession, verifyPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

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

    const valid = await verifyPassword(password, matchedUser.pinHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

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
