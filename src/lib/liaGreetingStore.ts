import { prisma } from "@/lib/prisma";

/**
 * URL pública do MP3 de saudação/menu (gerado na ingestão), ou null.
 */
export async function getLiaGreetingUrl(
  tenantSlug: string
): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;

  try {
    const row = await prisma.tenantLiaAsset.findUnique({
      where: { tenantSlug: tenantSlug.toLowerCase() },
      select: { greetingAudioUrl: true },
    });
    const u = row?.greetingAudioUrl?.trim();
    return u || null;
  } catch {
    return null;
  }
}
