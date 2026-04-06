import type { TenantConfig } from "@/config/tenants";
import { buildIngestGreetingScript } from "@/lib/liaIntro";
import { textToSpeechMp3, isElevenLabsConfigured } from "@/lib/elevenlabs";
import { prisma } from "@/lib/prisma";
import { savePublicMp3 } from "@/lib/ttsStorage";
import type { NewsItem } from "@/mocks/news";

export const GREETING_AUDIO_ID = "greeting";

/**
 * Gera o MP3 de saudação/menu após ingestão e grava `TenantLiaAsset.greetingAudioUrl`.
 * Mesmo texto usado como fallback no cliente se o ficheiro não existir.
 */
export async function generateGreetingAudioForTenant(
  tenant: TenantConfig
): Promise<string | null> {
  if (!isElevenLabsConfigured()) return null;

  const voiceId =
    process.env[`ELEVENLABS_VOICE_ID_${tenant.slug.toUpperCase()}`]?.trim() ||
    tenant.voiceId?.trim();
  if (!voiceId) return null;

  const rows = await prisma.newsArticle.findMany({
    where: { tenantSlug: tenant.slug },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  const items: NewsItem[] = rows.map((r) => ({
    id: r.id,
    tenantSlug: r.tenantSlug,
    category: r.category as NewsItem["category"],
    title: r.title,
    summary: r.summary,
    audioUrl: r.audioUrl || "",
    imageUrl: r.imageUrl || "",
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : undefined,
  }));
  const script = buildIngestGreetingScript(items, tenant.name, {
    at: new Date(),
  });
  if (!script.trim()) return null;

  try {
    const mp3 = await textToSpeechMp3(script, voiceId);
    const publicPath = await savePublicMp3(
      tenant.slug,
      GREETING_AUDIO_ID,
      mp3
    );

    await prisma.tenantLiaAsset.upsert({
      where: { tenantSlug: tenant.slug },
      create: {
        tenantSlug: tenant.slug,
        greetingAudioUrl: publicPath,
      },
      update: { greetingAudioUrl: publicPath },
    });

    console.log("[liaGreetingIngest] saudação gravada:", publicPath);
    return publicPath;
  } catch (e) {
    console.error("[liaGreetingIngest]", e);
    return null;
  }
}
