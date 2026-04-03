import { mkdir, writeFile } from "fs/promises";
import path from "path";

/** Caminho público servido pelo Next: /audio/{tenant}/{id}.mp3 */
export async function savePublicMp3(
  tenantSlug: string,
  articleId: string,
  buffer: Buffer
): Promise<string> {
  const safeTenant = tenantSlug.replace(/[^a-z0-9-_]/gi, "");
  const safeId = articleId.replace(/[^a-z0-9-_]/gi, "");
  const dir = path.join(process.cwd(), "public", "audio", safeTenant);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${safeId}.mp3`);
  await writeFile(file, buffer);
  return `/audio/${safeTenant}/${safeId}.mp3`;
}
