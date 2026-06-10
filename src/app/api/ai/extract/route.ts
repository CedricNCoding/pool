import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Extraction depuis un texte de CV / certificat : suggere competences, certifs,
// etiquettes en les rapprochant du referentiel. Utilise un LLM si AI_BASE_URL est
// configure (endpoint compatible OpenAI), sinon repli par correspondance de mots-cles.
export async function POST(req: NextRequest) {
  setTenantContext((await requireSession()).tenantId);
  const { text } = await req.json().catch(() => ({ text: "" }));
  if (!text || typeof text !== "string" || text.trim().length < 10) {
    return NextResponse.json({ skills: [], certs: [], tags: [], mode: "empty" });
  }

  const [skills, certs] = await Promise.all([
    prisma.skill.findMany({ include: { category: { select: { name: true, color: true } } } }),
    prisma.certification.findMany({ select: { id: true, name: true, issuer: true, color: true } }),
  ]);

  // Corpus a analyser : par defaut le texte fourni. Si un LLM est dispo, on lui
  // demande d'extraire des mots-cles, qu'on re-mappe ensuite sur le referentiel.
  let corpus = text;
  let mode: "ai" | "keyword" = "keyword";
  const aiUrl = process.env.AI_BASE_URL;
  if (aiUrl) {
    try {
      const res = await fetch(`${aiUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.AI_API_KEY ? { Authorization: `Bearer ${process.env.AI_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || "local-model",
          temperature: 0,
          messages: [
            {
              role: "system",
              content:
                "Tu extrais d'un CV/certificat audiovisuel les competences techniques, certifications et habilitations citees. Reponds uniquement par une liste de mots-cles separes par des virgules, sans phrase.",
            },
            { role: "user", content: text.slice(0, 6000) },
          ],
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const data = await res.json();
        const out = data?.choices?.[0]?.message?.content;
        if (typeof out === "string" && out.length > 0) {
          corpus = text + " " + out;
          mode = "ai";
        }
      }
    } catch {
      /* repli mots-cles */
    }
  }

  const hay = norm(corpus);
  const matchedSkills = skills
    .filter((s) => hay.includes(norm(s.name)))
    .map((s) => ({ id: s.id, name: s.name, color: s.category.color, family: s.category.name }));
  const matchedCerts = certs
    .filter((c) => hay.includes(norm(c.name)))
    .map((c) => ({ id: c.id, name: c.name, issuer: c.issuer, color: c.color }));

  const TAG_HINTS = [
    "vehicule", "permis b", "permis", "anglais", "espagnol", "allemand",
    "habilitation electrique", "travail en hauteur", "hauteur", "caces", "nacelle",
    "harnais", "sst", "aipr", "deplacement",
  ];
  const matchedTags = [...new Set(TAG_HINTS.filter((t) => hay.includes(norm(t))))];

  return NextResponse.json({
    skills: matchedSkills,
    certs: matchedCerts,
    tags: matchedTags,
    mode,
  });
}
