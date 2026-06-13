import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

export async function GET() {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const list = await prisma.interviewTemplate.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  const questions: string[] = Array.isArray(body.questions) ? body.questions.filter((q: string) => q.trim()) : [];
  const sections = JSON.stringify([{ title: body.name.trim(), questions }]);
  const t = await prisma.interviewTemplate.create({ data: { name: body.name.trim(), sections } });
  return NextResponse.json(t, { status: 201 });
}
