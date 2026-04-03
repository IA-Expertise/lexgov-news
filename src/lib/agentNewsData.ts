import { getNewsForTenant } from "@/lib/newsStore";
import { filterNewsByTopic } from "@/lib/voiceIntent";

export type AgentNewsItemJson = {
  id: string;
  title: string;
  summary: string;
  category: string;
  imageUrl: string;
  audioUrl: string | null;
  publishedAt: string | null;
};

/**
 * Mesma lógica de GET /api/agent/news — usada pelo intermediário LLM e pela API HTTP.
 */
export async function fetchNewsForAgent(
  city: string,
  options?: { q?: string; limit?: number }
): Promise<{ city: string; query: string | null; items: AgentNewsItemJson[] }> {
  const q = options?.q?.trim() ?? "";
  const limit = Math.min(
    25,
    Math.max(1, options?.limit ?? 8)
  );

  let items = await getNewsForTenant(city.trim().toLowerCase());
  if (q) items = filterNewsByTopic(items, q);

  return {
    city: city.trim().toLowerCase(),
    query: q || null,
    items: items.slice(0, limit).map((i) => ({
      id: i.id,
      title: i.title,
      summary: i.summary.slice(0, 500),
      category: i.category,
      imageUrl: i.imageUrl,
      audioUrl: i.audioUrl?.trim() ? i.audioUrl : null,
      publishedAt: i.publishedAt ?? null,
    })),
  };
}
