import { prisma } from "@/lib/prisma";
import { textToSpeechMp3, isElevenLabsConfigured } from "@/lib/elevenlabs";
import { savePublicMp3 } from "@/lib/ttsStorage";
import { buildTop3Script } from "@/lib/top3Script";

export { buildTop3Script } from "@/lib/top3Script";

export const TOP3_AUDIO_ID = "top3";

/**
 * Gera (ou re-gera) o áudio da lista das 3 notícias mais recentes do tenant.
 * Salvo em /audio/{tenantSlug}/top3.mp3
 *
 * Formato: "Encontrei as seguintes notícias: [título 1], [título 2] e [título 3]."
 */
export async function generateTop3Audio(tenant: {
  slug: string;
  voiceId: string;
}): Promise<string | null> {
  if (!isElevenLabsConfigured()) return null;

  const voiceId =
    process.env[`ELEVENLABS_VOICE_ID_${tenant.slug.toUpperCase()}`]?.trim() ||
    tenant.voiceId?.trim();
  if (!voiceId) return null;

  const articles = await prisma.newsArticle.findMany({
    where: { tenantSlug: tenant.slug },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: { title: true },
  });

  if (!articles.length) return null;

  const titles = articles.map((a) => a.title);
  const text = buildTop3Script(titles);

  try {
    const mp3 = await textToSpeechMp3(text, voiceId);
    const publicPath = await savePublicMp3(tenant.slug, TOP3_AUDIO_ID, mp3);
    console.log("[top3Audio] gerado:", publicPath);
    return publicPath;
  } catch (e) {
    console.error("[top3Audio]", e);
    return null;
  }
}
