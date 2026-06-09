import { SKILL_LEVELS, SERVICES, CONTRACT_TYPES } from "./constants";

export interface PdfTech {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  service: string;
  contractType: string;
  interventionCenterLat: number | null;
  interventionCenterLng: number | null;
  interventionRadiusKm: number;
  company: { name: string; color: string; city: string | null };
  agency: { name: string; city: string | null } | null;
  skills: { level: number; skill: { name: string; category: { name: string } } }[];
  certifications: {
    expiryDate: string | null;
    certification: { name: string; issuer: string };
  }[];
  tags: { name: string }[];
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) || 59,
    parseInt(h.substring(2, 4), 16) || 130,
    parseInt(h.substring(4, 6), 16) || 246,
  ];
}
function serviceLabel(v: string) {
  return SERVICES.find((s) => s.value === v)?.label ?? v;
}
function contractLabel(v: string) {
  return CONTRACT_TYPES.find((c) => c.value === v)?.label ?? v;
}
function levelLabel(n: number) {
  if (n === 0) return "Aucune";
  return SKILL_LEVELS.find((l) => l.value === n)?.label ?? `${n}`;
}
function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString("fr-FR") : "-";
}

export async function generateTechnicianPdf(
  tech: PdfTech,
  mode: "fiche" | "attestation" = "fiche"
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const [r, g, b] = hexToRgb(tech.company.color);
  const fullName = `${tech.firstName} ${tech.lastName}`;

  // --- Bandeau entete entreprise ---
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, W, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(tech.company.name, 14, 13);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    mode === "attestation" ? "Attestation de competences" : "Fiche technicien",
    14,
    20
  );
  doc.text(`Edite le ${new Date().toLocaleDateString("fr-FR")}`, W - 14, 20, {
    align: "right",
  });

  doc.setTextColor(20, 20, 20);
  let y = 38;

  // --- QR code vers la fiche en ligne (pour identification sur site) ---
  try {
    const QRCode = (await import("qrcode")).default;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const dataUrl = await QRCode.toDataURL(`${origin}/technicians/${tech.id}`, {
      margin: 1,
      width: 120,
    });
    doc.addImage(dataUrl, "PNG", W - 38, 32, 24, 24);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text("Fiche en ligne", W - 36, 59);
    doc.setTextColor(20, 20, 20);
  } catch {
    /* QR optionnel */
  }

  // --- Identite ---
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(fullName, 14, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  const ident = [
    `${serviceLabel(tech.service)} — ${contractLabel(tech.contractType)}`,
    `${tech.company.name}${tech.agency ? " / " + tech.agency.name : ""}`,
    tech.email,
    tech.phone || "",
  ].filter(Boolean);
  doc.text(ident.join("   |   "), 14, y);
  y += 6;
  if (
    tech.interventionCenterLat != null &&
    tech.interventionCenterLng != null
  ) {
    doc.text(
      `Zone d'intervention : ${tech.interventionRadiusKm} km autour de ${tech.interventionCenterLat.toFixed(3)}, ${tech.interventionCenterLng.toFixed(3)}`,
      14,
      y
    );
    y += 6;
  }
  if (tech.tags.length > 0) {
    doc.text(`Attributs : ${tech.tags.map((t) => t.name).join(", ")}`, 14, y);
    y += 6;
  }
  doc.setTextColor(20, 20, 20);

  if (mode === "attestation") {
    y += 4;
    doc.setFontSize(10);
    const intro = doc.splitTextToSize(
      `Nous, ${tech.company.name}, attestons que ${fullName}, ${serviceLabel(tech.service)}, possede les competences et certifications detaillees ci-dessous.`,
      W - 28
    );
    doc.text(intro, 14, y);
    y += intro.length * 5 + 4;
  }

  // --- Competences ---
  const skillRows = [...tech.skills]
    .sort((a, b) => b.level - a.level)
    .map((s) => [s.skill.category.name, s.skill.name, levelLabel(s.level)]);
  if (skillRows.length > 0) {
    autoTable(doc, {
      startY: y + 2,
      head: [["Famille", "Competence", "Niveau"]],
      body: skillRows,
      headStyles: { fillColor: [r, g, b], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
      theme: "striped",
    });
    // @ts-expect-error lastAutoTable est ajoute par le plugin
    y = doc.lastAutoTable.finalY + 6;
  }

  // --- Certifications ---
  const certRows = tech.certifications.map((c) => [
    c.certification.name,
    c.certification.issuer,
    c.expiryDate ? `Expire le ${fmt(c.expiryDate)}` : "Sans expiration",
  ]);
  if (certRows.length > 0) {
    autoTable(doc, {
      startY: y + 2,
      head: [["Certification", "Organisme", "Validite"]],
      body: certRows,
      headStyles: { fillColor: [r, g, b], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
      theme: "striped",
    });
    // @ts-expect-error lastAutoTable
    y = doc.lastAutoTable.finalY + 6;
  }

  if (mode === "attestation") {
    const sy = Math.max(y + 14, doc.internal.pageSize.getHeight() - 40);
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text("Fait pour servir et valoir ce que de droit.", 14, sy);
    doc.text("Signature et cachet :", W - 80, sy + 8);
    doc.setDrawColor(180, 180, 180);
    doc.rect(W - 80, sy + 11, 66, 22);
  }

  const safe = fullName.normalize("NFD").replace(/[^\w]+/g, "_");
  doc.save(`${mode === "attestation" ? "attestation" : "fiche"}_${safe}.pdf`);
}

export interface PdfProject {
  title: string;
  description: string | null;
  company: { name: string; color: string } | null;
  technicians: {
    firstName: string;
    lastName: string;
    service: string;
    company: { name: string; color: string };
    agency: { city: string | null } | null;
    skills: { level: number; skill: { name: string } }[];
    certifications: { certification: { name: string } }[];
  }[];
}

// Proposition d'equipe / dossier crew, a l'entete de l'entreprise du projet.
export async function generateProjectPdf(p: PdfProject) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const color = p.company?.color ?? p.technicians[0]?.company.color ?? "#3B82F6";
  const [r, g, b] = hexToRgb(color);

  doc.setFillColor(r, g, b);
  doc.rect(0, 0, W, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(p.company?.name ?? "Proposition d'equipe", 14, 13);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Proposition d'equipe", 14, 20);
  doc.text(`Edite le ${new Date().toLocaleDateString("fr-FR")}`, W - 14, 20, { align: "right" });

  doc.setTextColor(20, 20, 20);
  let y = 38;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(p.title, 14, y);
  y += 7;
  if (p.description) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 90);
    const lines = doc.splitTextToSize(p.description, W - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 2;
    doc.setTextColor(20, 20, 20);
  }
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Equipe proposee : ${p.technicians.length} technicien(s)`, 14, y + 2);

  const rows = p.technicians.map((t) => {
    const top = [...t.skills].sort((a, b) => b.level - a.level).slice(0, 4).map((s) => s.skill.name).join(", ");
    return [
      `${t.firstName} ${t.lastName}`,
      t.company.name,
      serviceLabel(t.service),
      top || "-",
      String(t.certifications.length),
    ];
  });
  autoTable(doc, {
    startY: y + 6,
    head: [["Technicien", "Entreprise", "Service", "Competences cles", "Certifs"]],
    body: rows,
    headStyles: { fillColor: [r, g, b], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
    theme: "striped",
  });

  const safe = p.title.normalize("NFD").replace(/[^\w]+/g, "_");
  doc.save(`projet_${safe}.pdf`);
}
