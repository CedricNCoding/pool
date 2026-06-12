import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createToken } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { rateLimit, sweepRateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  // Anti brute-force : max 10 tentatives / 5 min par IP (best-effort, par instance).
  const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  sweepRateLimit();
  const rl = rateLimit(`login:${ip}`, 10, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email et mot de passe requis" },
      { status: 400 }
    );
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    return NextResponse.json(
      { error: "Identifiants invalides" },
      { status: 401 }
    );
  }

  const token = await createToken(user);

  await auditLog({
    userId: user.id,
    action: "login",
    entityType: "user",
    entityId: user.id,
    ipAddress: req.headers.get("x-forwarded-for") || "unknown",
  });

  const response = NextResponse.json({ user });
  response.cookies.set("av-pool-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60,
    path: "/",
  });

  return response;
}
