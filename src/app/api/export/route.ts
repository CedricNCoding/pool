import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "csv";
  const companyId = url.searchParams.get("companyId");

  const where: Record<string, unknown> = {};
  if (session.role !== "admin" && session.companyId) {
    where.companyId = session.companyId;
  } else if (companyId) {
    where.companyId = companyId;
  }

  const technicians = await prisma.technician.findMany({
    where,
    include: {
      company: true,
      agency: true,
      skills: { include: { skill: { include: { category: true } } } },
      certifications: { include: { certification: true } },
    },
    orderBy: [{ company: { name: "asc" } }, { lastName: "asc" }],
  });

  if (format === "csv") {
    const headers = [
      "Nom",
      "Prenom",
      "Email",
      "Telephone",
      "Entreprise",
      "Agence",
      "Service",
      "Type contrat",
      "Debut contrat",
      "Fin contrat",
      "Actif",
      "Competences",
      "Certifications",
    ];

    const rows = technicians.map((t) => [
      t.lastName,
      t.firstName,
      t.email,
      t.phone || "",
      t.company.name,
      t.agency?.name || "",
      t.service,
      t.contractType,
      t.contractStart?.toISOString().split("T")[0] || "",
      t.contractEnd?.toISOString().split("T")[0] || "",
      t.isActive ? "Oui" : "Non",
      t.skills
        .map(
          (s) =>
            `${s.skill.name} (${["Debutant", "Avance", "Senior", "Maitrise"][s.level - 1]})`
        )
        .join("; "),
      t.certifications
        .map(
          (c) =>
            `${c.certification.name}${c.expiryDate ? ` exp:${c.expiryDate.toISOString().split("T")[0]}` : ""}`
        )
        .join("; "),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const bom = "﻿";

    await auditLog({
      userId: session.id,
      action: "export",
      entityType: "technician",
      details: `CSV export, ${technicians.length} records`,
    });

    return new NextResponse(bom + csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="techniciens_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Format non supporte" }, { status: 400 });
}
