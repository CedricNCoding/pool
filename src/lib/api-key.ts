import { prisma } from "./db";
import { createHash, randomBytes } from "crypto";

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `avp_${randomBytes(32).toString("hex")}`;
  const prefix = key.substring(0, 11);
  const hash = createHash("sha256").update(key).digest("hex");
  return { key, hash, prefix };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function validateApiKey(key: string) {
  const hash = hashApiKey(key);
  const apiKey = await prisma.apiKey.findFirst({
    where: { keyHash: hash, isActive: true },
    include: { company: true },
  });
  if (!apiKey) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return apiKey;
}
