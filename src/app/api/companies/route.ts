import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companies = db.select().from(schema.companies).orderBy(schema.companies.name).all();
  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId || session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, slug, primaryColor } = await req.json();
  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
  }

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

  const result = db
    .insert(schema.companies)
    .values({
      name: name.trim(),
      slug: cleanSlug,
      primaryColor: primaryColor || "#d97706",
    })
    .returning()
    .get();

  return NextResponse.json(result, { status: 201 });
}
