import { prisma } from "./db";
import { createHmac } from "crypto";

// Événements émis par Praxis. Étendre ici quand on instrumente d'autres points.
export type WebhookEvent =
  | "assistance.created"
  | "assistance.resolved";

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: "assistance.created", label: "Demande de renfort créée" },
  { value: "assistance.resolved", label: "Demande de renfort arbitrée" },
];

// --- Garde anti-SSRF ---------------------------------------------------------
// L'URL d'un webhook est fournie par un admin et appelée côté serveur : on
// refuse tout ce qui n'est pas https public (loopback, réseaux privés, lien
// local, IP de métadonnées cloud). Ne couvre pas le DNS rebinding (un nom
// public peut pointer vers une IP privée à l'envoi) — atténué par le proxy
// egress Spektalis et l'enregistrement réservé aux admins.
function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, ""); // déballe IPv6 [..]
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  // IPv6 loopback / link-local / unique-local
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0) return true; // privé / loopback / "this host"
    if (a === 169 && b === 254) return true; // link-local + métadonnées cloud (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true; // privé
    if (a === 192 && b === 168) return true; // privé
    if (a >= 224) return true; // multicast / réservé
  }
  return false;
}

export function validateWebhookUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, error: "URL invalide" };
  }
  if (u.protocol !== "https:") return { ok: false, error: "Le webhook doit être en https://" };
  if (isPrivateHost(u.hostname)) return { ok: false, error: "Cible interne/privée interdite" };
  return { ok: true, url: u.toString() };
}

function matches(hookEvents: string, event: WebhookEvent): boolean {
  if (hookEvents === "all") return true;
  return hookEvents.split(",").map((s) => s.trim()).includes(event);
}

// Émet l'événement vers les webhooks actifs du tenant courant (cloisonné par
// l'extension Prisma). Signature HMAC-SHA256 du corps brut dans
// X-Praxis-Signature. Non bloquant : les POST partent sans être attendus et la
// route appelante n'échoue jamais à cause d'un webhook.
export async function dispatchWebhook(event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  let hooks: { id: string; url: string; secret: string; events: string }[];
  try {
    hooks = await prisma.webhook.findMany({
      where: { isActive: true },
      select: { id: true, url: true, secret: true, events: true },
    });
  } catch {
    return;
  }
  const targets = hooks.filter((h) => matches(h.events, event));
  if (targets.length === 0) return;

  const body = JSON.stringify({ event, sentAt: new Date().toISOString(), data });

  for (const h of targets) {
    // Re-valide à l'envoi (l'enregistrement a pu précéder un durcissement).
    if (!validateWebhookUrl(h.url).ok) continue;
    const sig = createHmac("sha256", h.secret).update(body).digest("hex");
    void fetch(h.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Praxis-Event": event,
        "X-Praxis-Signature": `sha256=${sig}`,
        "User-Agent": "Praxis-Webhooks/1",
      },
      body,
      signal: AbortSignal.timeout(5000),
      redirect: "error", // un 30x vers une cible interne ne doit pas être suivi
    })
      .then((res) =>
        prisma.webhook
          .update({
            where: { id: h.id },
            data: { lastStatus: res.status, lastFiredAt: new Date(), lastError: res.ok ? null : `HTTP ${res.status}` },
          })
          .catch(() => {})
      )
      .catch((err: unknown) =>
        prisma.webhook
          .update({
            where: { id: h.id },
            data: { lastStatus: 0, lastFiredAt: new Date(), lastError: String((err as Error)?.message ?? err).slice(0, 200) },
          })
          .catch(() => {})
      );
  }
}
