import { prisma } from "./db";
import bcryptjs from "bcryptjs";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

// Secret resolu paresseusement : en production, l'absence d'AUTH_SECRET doit
// echouer a l'execution (signature/verification), pas a l'import (sinon
// `next build`, qui force NODE_ENV=production, casserait).
function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET est obligatoire en production (aucun secret par defaut)."
      );
    }
    return new TextEncoder().encode("dev-secret-change-me");
  }
  return new TextEncoder().encode(s);
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager";
  companyId: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export async function createToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("av-pool-token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireSession();
  if (session.role !== "admin") throw new Error("Forbidden");
  return session;
}

export function canAccessCompany(
  user: SessionUser,
  companyId: string
): boolean {
  if (user.role === "admin") return true;
  return user.companyId === companyId;
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "admin" | "manager",
    companyId: user.companyId,
  };
}
