import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { technicianCode } from "@/lib/anon";
import { auditLog } from "@/lib/audit";

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  declined: "Refusée",
};

// Demandes de renfort.
//  - POST  : un gestionnaire sollicite un technicien d'une AUTRE société.
//  - GET   : gestionnaire -> SES demandes (anonymisées) ; admin -> toutes (identité réelle).
export async function POST(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const body = await req.json();

  if (!session.companyId) {
    return NextResponse.json({ error: "Réservé aux gestionnaires d'une société" }, { status: 403 });
  }
  const technicianId = String(body.technicianId ?? "");
  const message = String(body.message ?? "").trim();
  if (!technicianId || !message) {
    return NextResponse.json({ error: "Technicien et message requis" }, { status: 400 });
  }

  // Technicien du même tenant (findFirst scopé). On ne révèle pas son identité.
  const tech = await prisma.technician.findFirst({ where: { id: technicianId } });
  if (!tech) return NextResponse.json({ error: "Technicien introuvable" }, { status: 404 });
  if (tech.companyId === session.companyId) {
    return NextResponse.json(
      { error: "Ce technicien fait déjà partie de votre société" },
      { status: 400 }
    );
  }

  const reqRow = await prisma.assistanceRequest.create({
    data: {
      technicianId,
      requesterUserId: session.id,
      requesterCompanyId: session.companyId,
      message,
      status: "pending",
    },
  });

  await auditLog({
    userId: session.id,
    action: "create",
    entityType: "assistance_request",
    entityId: reqRow.id,
    details: `Demande de renfort ${technicianCode(technicianId)}`,
  });

  return NextResponse.json({ id: reqRow.id, status: reqRow.status, code: technicianCode(technicianId) }, { status: 201 });
}

export async function GET() {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const isAdmin = session.role === "admin" || session.role === "superadmin";

  if (isAdmin) {
    // Vue arbitrage : identité réelle du technicien + société demandeuse.
    const rows = await prisma.assistanceRequest.findMany({
      include: {
        technician: {
          select: {
            id: true, firstName: true, lastName: true, email: true, phone: true,
            service: true, company: { select: { name: true, color: true } },
          },
        },
        requesterCompany: { select: { name: true, color: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        status: r.status,
        statusLabel: STATUS_LABEL[r.status] ?? r.status,
        message: r.message,
        adminNote: r.adminNote,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
        code: technicianCode(r.technicianId),
        technician: r.technician,
        requesterCompany: r.requesterCompany,
      }))
    );
  }

  // Gestionnaire : SES demandes, technicien anonymisé (code + société, jamais l'identité).
  const rows = await prisma.assistanceRequest.findMany({
    where: { requesterUserId: session.id },
    include: {
      technician: { select: { id: true, service: true, company: { select: { name: true, color: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      status: r.status,
      statusLabel: STATUS_LABEL[r.status] ?? r.status,
      message: r.message,
      adminNote: r.adminNote,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
      code: technicianCode(r.technicianId),
      service: r.technician.service,
      company: r.technician.company?.name ?? null,
      companyColor: r.technician.company?.color ?? null,
    }))
  );
}
