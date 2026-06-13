import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { prisma } from "./db";

// ============================================================================
// Intégration Odoo (BÉTA) — client JSON-RPC + chiffrement de la clé API +
// synchronisation du planning (Booking) avec les tâches Odoo (project.task).
// ============================================================================

// --- Chiffrement AES-256-GCM de la clé API (jamais stockée en clair) ---
function encKey(): Buffer {
  const s = process.env.AUTH_SECRET || "dev-secret-change-me";
  return createHash("sha256").update(`odoo:${s}`).digest(); // 32 octets
}
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", encKey(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  const tag = c.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}
export function decryptSecret(enc: string): string {
  const [iv, tag, ct] = enc.split(":");
  const d = createDecipheriv("aes-256-gcm", encKey(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
}

// --- Garde URL : https public uniquement (anti-SSRF) ---
export function validateOdooUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  let u: URL;
  try { u = new URL(raw); } catch { return { ok: false, error: "URL invalide" }; }
  if (u.protocol !== "https:") return { ok: false, error: "L'URL Odoo doit être en https://" };
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) {
    return { ok: false, error: "Cible interne/privée interdite" };
  }
  return { ok: true, url: u.origin };
}

// --- Client JSON-RPC ---
async function rpc(url: string, service: string, method: string, args: unknown[]): Promise<unknown> {
  const res = await fetch(`${url}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: 1 }),
    signal: AbortSignal.timeout(20000),
    redirect: "error",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) {
    const m = json.error?.data?.message || json.error?.message || "Erreur Odoo";
    throw new Error(m);
  }
  return json.result;
}

export interface OdooConn { url: string; db: string; login: string; apiKey: string; model: string; defaultProject: string | null }

async function authenticate(c: OdooConn): Promise<number> {
  const uid = (await rpc(c.url, "common", "authenticate", [c.db, c.login, c.apiKey, {}])) as number | false;
  if (!uid) throw new Error("Authentification refusée (login / clé API / base incorrects)");
  return uid;
}
async function exec(c: OdooConn, uid: number, model: string, method: string, args: unknown[] = [], kwargs: Record<string, unknown> = {}): Promise<unknown> {
  return rpc(c.url, "object", "execute_kw", [c.db, uid, c.apiKey, model, method, args, kwargs]);
}

function odooDt(d: Date): string {
  // "YYYY-MM-DD HH:MM:SS" en UTC (format attendu par Odoo).
  return d.toISOString().slice(0, 19).replace("T", " ");
}

// --- Test de connexion + diagnostic ---
export async function testConnection(c: OdooConn) {
  const version = (await rpc(c.url, "common", "version", [])) as Record<string, unknown>;
  const uid = await authenticate(c);
  const taskCount = (await exec(c, uid, c.model, "search_count", [[]])) as number;
  // détecte les champs de planning + variante Field Service.
  let fields: Record<string, unknown> = {};
  try { fields = (await exec(c, uid, c.model, "fields_get", [["planned_date_begin", "planned_date_end", "date_deadline", "is_fsm", "user_ids"]], { attributes: ["string"] })) as Record<string, unknown>; } catch { /* champ absent */ }
  return {
    ok: true,
    serverVersion: version.server_version ?? "?",
    uid,
    model: c.model,
    taskCount,
    hasPlannedDates: !!fields.planned_date_begin,
    isFieldService: !!fields.is_fsm,
  };
}

// --- Résolution utilitaires ---
async function userIdByEmail(c: OdooConn, uid: number, email: string): Promise<number | null> {
  if (!email) return null;
  const ids = (await exec(c, uid, "res.users", "search", [["|", ["login", "=", email], ["email", "=", email]]], { limit: 1 })) as number[];
  return ids[0] ?? null;
}
async function ensureProject(c: OdooConn, uid: number, name: string): Promise<number> {
  const found = (await exec(c, uid, "project.project", "search", [[["name", "=", name]]], { limit: 1 })) as number[];
  if (found[0]) return found[0];
  return (await exec(c, uid, "project.project", "create", [{ name }])) as number;
}

// --- PUSH : créneaux Praxis -> tâches Odoo (tenant courant déjà scopé) ---
export async function pushBookings(c: OdooConn): Promise<{ pushed: number; errors: string[] }> {
  const uid = await authenticate(c);
  const now = new Date();
  const horizon = new Date(now.getTime() + 90 * 86400000);
  const bookings = await prisma.booking.findMany({
    where: { start: { gte: now, lte: horizon }, status: { not: "decline" } },
    include: { technician: { select: { firstName: true, lastName: true, email: true } }, project: { select: { title: true } } },
  });
  const errors: string[] = [];
  const projCache = new Map<string, number>();
  let pushed = 0;
  for (const b of bookings) {
    try {
      const ouid = await userIdByEmail(c, uid, b.technician.email);
      const projName = c.defaultProject || b.project.title;
      let pid = projCache.get(projName);
      if (pid == null) { pid = await ensureProject(c, uid, projName); projCache.set(projName, pid); }
      const vals: Record<string, unknown> = {
        name: `${b.project.title} — ${b.technician.firstName} ${b.technician.lastName}`,
        project_id: pid,
        planned_date_begin: odooDt(b.start),
        planned_date_end: odooDt(b.end),
      };
      if (ouid) vals.user_ids = [[6, 0, [ouid]]];
      if (b.odooTaskId) {
        await exec(c, uid, c.model, "write", [[b.odooTaskId], vals]);
      } else {
        const tid = (await exec(c, uid, c.model, "create", [vals])) as number;
        await prisma.booking.update({ where: { id: b.id }, data: { odooTaskId: tid } });
      }
      pushed++;
    } catch (e) {
      errors.push(`${b.technician.firstName} ${b.technician.lastName} (${b.start.toISOString().slice(0, 10)}) : ${(e as Error).message}`);
    }
  }
  return { pushed, errors };
}

// --- PULL : tâches Odoo planifiées -> créneaux Praxis (best-effort, Béta) ---
export async function pullTasks(c: OdooConn): Promise<{ pulled: number; skipped: string[] }> {
  const uid = await authenticate(c);
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 86400000);
  const horizon = new Date(now.getTime() + 90 * 86400000);
  const tasks = (await exec(c, uid, c.model, "search_read", [[["planned_date_begin", ">=", odooDt(from)], ["planned_date_begin", "<=", odooDt(horizon)]]], {
    fields: ["id", "name", "project_id", "user_ids", "planned_date_begin", "planned_date_end"], limit: 500,
  })) as Array<{ id: number; name: string; project_id: [number, string] | false; user_ids: number[]; planned_date_begin: string; planned_date_end: string | false }>;

  // emails des users Odoo référencés
  const allUserIds = [...new Set(tasks.flatMap((t) => t.user_ids || []))];
  const users = allUserIds.length ? (await exec(c, uid, "res.users", "read", [allUserIds], { fields: ["login", "email"] })) as Array<{ id: number; login: string; email: string | false }> : [];
  const emailByUser = new Map(users.map((u) => [u.id, (u.email || u.login || "").toLowerCase()]));

  let pulled = 0; const skipped: string[] = [];
  for (const t of tasks) {
    try {
      if (!t.planned_date_begin || !t.project_id) { skipped.push(`${t.name} : pas de date/projet`); continue; }
      const proj = await prisma.project.findFirst({ where: { title: t.project_id[1] }, select: { id: true } });
      if (!proj) { skipped.push(`${t.name} : projet « ${t.project_id[1]} » introuvable côté Praxis`); continue; }
      const email = (t.user_ids || []).map((u) => emailByUser.get(u)).find(Boolean);
      if (!email) { skipped.push(`${t.name} : aucun assigné rapprochable`); continue; }
      const tech = await prisma.technician.findFirst({ where: { email }, select: { id: true } });
      if (!tech) { skipped.push(`${t.name} : technicien « ${email} » introuvable`); continue; }
      const start = new Date(t.planned_date_begin.replace(" ", "T") + "Z");
      const end = t.planned_date_end ? new Date(t.planned_date_end.replace(" ", "T") + "Z") : new Date(start.getTime() + 8 * 3600000);
      const existing = await prisma.booking.findFirst({ where: { odooTaskId: t.id } });
      if (existing) await prisma.booking.update({ where: { id: existing.id }, data: { start, end, projectId: proj.id, technicianId: tech.id } });
      else await prisma.booking.create({ data: { projectId: proj.id, technicianId: tech.id, start, end, status: "pressenti", odooTaskId: t.id } });
      pulled++;
    } catch (e) {
      skipped.push(`${t.name} : ${(e as Error).message}`);
    }
  }
  return { pulled, skipped };
}
