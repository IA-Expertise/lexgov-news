import type { AudioStorageProvider } from "./types";
import { localPublicAudioStorage } from "./localPublicStorage";

let override: AudioStorageProvider | null = null;

/** Permite testes ou futuro adapter R2/S3. */
export function setAudioStorageProvider(p: AudioStorageProvider | null): void {
  override = p;
}

/**
 * Provider ativo. Hoje: sempre armazenamento local em `public/audio`.
 * Quando `AUDIO_STORAGE_ADAPTER=r2` (futuro), trocar implementação aqui.
 */
export function getAudioStorage(): AudioStorageProvider {
  if (override) return override;
  const adapter = process.env.AUDIO_STORAGE_ADAPTER?.trim().toLowerCase();
  if (adapter === "r2" || adapter === "s3") {
    console.warn(
      "[storage] AUDIO_STORAGE_ADAPTER=%s sem implementação — usando local.",
      adapter
    );
  }
  return localPublicAudioStorage;
}
