/**
 * Abstração para gravar MP3 gerados na ingestão / admin.
 * Implementação padrão: disco em `public/audio/{tenant}/{id}.mp3`.
 * Futuro: S3/R2 com URL absoluta retornada em `saveMp3`.
 */
export type AudioStorageProvider = {
  saveMp3(
    tenantSlug: string,
    fileId: string,
    buffer: Buffer
  ): Promise<string>;
};
