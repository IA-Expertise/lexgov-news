import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { AudioStorageProvider } from "./types";

/** Grava em `public/audio/{tenant}/{fileId}.mp3` e retorna caminho público `/audio/...`. */
export const localPublicAudioStorage: AudioStorageProvider = {
  async saveMp3(tenantSlug: string, fileId: string, buffer: Buffer) {
    const safeTenant = tenantSlug.replace(/[^a-z0-9-_]/gi, "");
    const safeId = fileId.replace(/[^a-z0-9-_]/gi, "");
    const dir = path.join(process.cwd(), "public", "audio", safeTenant);
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${safeId}.mp3`);
    await writeFile(file, buffer);
    return `/audio/${safeTenant}/${safeId}.mp3`;
  },
};
