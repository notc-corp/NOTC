import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { getSession, verifyPin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();

    if (!pin || typeof pin !== "string") {
      return NextResponse.json({ error: "PIN is required" }, { status: 400 });
    }

    // Find active user by checking all PINs
    const allUsers = await db
      .select()
      .from(users)
      .where(eq(users.isActive, true));

    let matchedUser = null;
    for (const user of allUsers) {
      if (await verifyPin(pin, user.pinHash)) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
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
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
