// Limiteur de débit en mémoire (best-effort, par instance). Défense en
// profondeur applicative — le filtrage réseau (Traefik/CrowdSec) reste la
// première ligne. Se réinitialise au redémarrage : acceptable pour un anti
// brute-force de login.
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  if (b.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((b.reset - now) / 1000)) };
  }
  return { ok: true, retryAfter: 0 };
}

// Purge occasionnelle pour éviter une croissance non bornée de la Map.
export function sweepRateLimit() {
  const now = Date.now();
  for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
}
