import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Resolu paresseusement (cf src/lib/auth.ts) pour ne pas casser `next build`.
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

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/v1"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("av-pool-token")?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    await jwtVerify(token, getSecret());
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Session expiree" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.set("av-pool-token", "", { maxAge: 0 });
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
