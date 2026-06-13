import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

// Habilitations sécurité arrivant à échéance (ou expirées) à piloter en
// renouvellement. ?days=90 horizon (défaut 120). Cloisonné société pour les
// gestionnaires.
export async function GET(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const days = parseInt(new URL(req.url).searchParams.get("days") || "120") || 120;
  const horizon = new Date(Date.now() + days * 86400000);
  const isAdmin = session.role === "admin" || session.role === "superadmin";

  const techWhere = isAdmin ? {} : { companyId: session.companyId ?? "__none__" };

  const rows = await prisma.technicianCertification.findMany({
    where: {
      status: "active",
      expiryDate: { not: null, lte: horizon },
      certification: { category: "securite" },
      technician: techWhere,
    },
    include: {
      certification: { select: { name: true } },
      technician: { select: { id: true, firstName: true, lastName: true, company: { select: { name: true, color: true } } } },
    },
    orderBy: { expiryDate: "asc" },
  });
  return NextResponse.json(rows);
}
