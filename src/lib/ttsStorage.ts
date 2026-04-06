import { getAudioStorage } from "@/lib/storage";

/** Caminho público ou URL absoluta — conforme `AudioStorageProvider`. */
export async function savePublicMp3(
  tenantSlug: string,
  articleId: string,
  buffer: Buffer
): Promise<string> {
  return getAudioStorage().saveMp3(tenantSlug, articleId, buffer);
}
