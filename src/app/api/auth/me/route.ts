import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: {
      userId: session.userId,
      role: session.role,
      name: session.name,
    },
  });
}
