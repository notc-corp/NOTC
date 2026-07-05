import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companies, users } from "@/db/schema";
import { getSession, hashPin } from "@/lib/auth";
import { eq } from "drizzle-orm";

function toSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "company"
  );
}

export async function POST(req: NextRequest) {
  try {
    const { companyName, ownerName, username, password } = await req.json();

    if (!companyName?.trim() || !ownerName?.trim() || !username?.trim() || !password) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{1,19}$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: "Username: 2–20 chars, letters/digits/dots/dashes only" },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
    }

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, cleanUsername));
    if (existingUser) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    let slug = toSlug(companyName);
    const [existingCompany] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, slug));
    if (existingCompany) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const pinHash = await hashPin(password);

    const [company] = await db
      .insert(companies)
      .values({ name: companyName.trim(), slug, trialEndsAt, subscriptionStatus: "trial", planName: "trial" })
      .returning();

    const [user] = await db
      .insert(users)
      .values({
        companyId: company.id,
        name: ownerName.trim(),
        username: cleanUsername,
        role: "owner",
        pinHash,
      })
      .returning();

    const session = await getSession();
    session.userId = user.id;
    session.role = "owner";
    session.name = user.name;
    session.companyId = company.id;
    await session.save();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
