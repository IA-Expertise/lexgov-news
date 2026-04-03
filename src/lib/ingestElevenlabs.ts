import { prisma } from "@/lib/prisma";
import { textToSpeechMp3, isElevenLabsConfigured } from "@/lib/elevenlabs";
import { savePublicMp3 } from "@/lib/ttsStorage";

type TenantLike = { slug: string; voiceId: string };

/**
 * Gera MP3 via ElevenLabs e grava `audioUrl` no registro.
 * Falhas são ignoradas (ingestão RSS não quebra).
 */
export async function attachTtsToArticleIfPossible(
  articleId: string,
  tenant: TenantLike,
  title: string,
  summary: string,
  options?: { force?: boolean }
): Promise<void> {
  if (!isElevenLabsConfigured()) return;

  const voiceId = process.env[`ELEVENLABS_VOICE_ID_${tenant.slug.toUpperCase()}`]?.trim()
    || tenant.voiceId?.trim();
  if (!voiceId) return;

  const existing = await prisma.newsArticle.findUnique({
    where: { id: articleId },
    select: { audioUrl: true },
  });
  if (existing?.audioUrl && !options?.force) return;

  const script = `${title}. ${summary}`.replace(/\s+/g, " ").trim().slice(0, 4500);

  try {
    const mp3 = await textToSpeechMp3(script, voiceId);
    const publicPath = await savePublicMp3(tenant.slug, articleId, mp3);
    await prisma.newsArticle.update({
      where: { id: articleId },
      data: { audioUrl: publicPath },
    });
  } catch (e) {
    console.error("[ingest TTS]", articleId, e);
  }
}
