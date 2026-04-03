import { prisma } from "@/lib/prisma";
import type { NewsItem } from "@/mocks/news";
import { getNewsByTenantSlug } from "@/mocks/news";

function rowToNewsItem(r: {
  id: string;
  tenantSlug: string;
  category: string;
  title: string;
  summary: string;
  imageUrl: string;
  publishedAt: Date | null;
}): NewsItem {
  return {
    id: r.id,
    tenantSlug: r.tenantSlug,
    category: r.category as NewsItem["category"],
    title: r.title,
    summary: r.summary,
    audioUrl: "",
    imageUrl: r.imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80",
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : undefined,
  };
}

/**
 * Lê notícias do PostgreSQL (ingestão RSS). Se não houver `DATABASE_URL`,
 * tabela vazia ou erro, usa mocks.
 */
export async function getNewsForTenant(tenantSlug: string): Promise<NewsItem[]> {
  if (!process.env.DATABASE_URL) {
    return getNewsByTenantSlug(tenantSlug);
  }

  try {
    const rows = await prisma.newsArticle.findMany({
      where: { tenantSlug: tenantSlug.toLowerCase() },
      orderBy: { publishedAt: "desc" },
      take: 50,
    });
    if (!rows.length) {
      return getNewsByTenantSlug(tenantSlug);
    }
    return rows.map(rowToNewsItem);
  } catch {
    return getNewsByTenantSlug(tenantSlug);
  }
}
