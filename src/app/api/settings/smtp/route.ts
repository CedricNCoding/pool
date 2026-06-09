import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import nodemailer from "nodemailer";

export async function GET() {
  await requireAdmin();
  const settings = await prisma.setting.findMany({
    where: {
      key: { in: ["smtp_host", "smtp_port", "smtp_user", "smtp_from", "smtp_secure"] },
    },
  });
  const config: Record<string, string> = {};
  settings.forEach((s) => (config[s.key] = s.value));
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();

  const keys = ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from", "smtp_secure"];
  for (const key of keys) {
    if (body[key] !== undefined) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: body[key] },
        create: { key, value: body[key] },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  await requireAdmin();

  const settings = await prisma.setting.findMany({
    where: {
      key: { in: ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from", "smtp_secure"] },
    },
  });
  const config: Record<string, string> = {};
  settings.forEach((s) => (config[s.key] = s.value));

  if (!config.smtp_host) {
    return NextResponse.json({ error: "SMTP non configure" }, { status: 400 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: parseInt(config.smtp_port || "587"),
      secure: config.smtp_secure === "true",
      auth: { user: config.smtp_user, pass: config.smtp_pass },
    });

    await transporter.verify();
    return NextResponse.json({ ok: true, message: "Connexion SMTP reussie" });
  } catch (err) {
    return NextResponse.json(
      { error: `Echec connexion SMTP: ${err instanceof Error ? err.message : "erreur inconnue"}` },
      { status: 400 }
    );
  }
}
