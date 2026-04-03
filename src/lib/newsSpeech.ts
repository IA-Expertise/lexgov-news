import type { NewsItem } from "@/mocks/news";

/** Trecho curto para TTS / leitura (título + começo do texto) */
export function speechText(item: NewsItem): string {
  const full = `${item.title}. ${item.summary}`;
  const sentences = full.match(/[^.!?]+[.!?]+/g) ?? [full];
  let result = "";
  for (const s of sentences) {
    if ((result + s).length > 300) break;
    result += s + " ";
  }
  return result.trim() || full.slice(0, 300);
}
