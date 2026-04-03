import Parser from "rss-parser";
import type { NewsCategory } from "@/mocks/news";

const parser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent": "LexGov-News/1.0 (RSS ingestão municipal)",
  },
});

function inferCategory(title: string, body: string): NewsCategory {
  const t = `${title} ${body}`.toLowerCase();
  if (/(saúde|saude|hospital|vacina|dengue|posto|ubs)/.test(t)) return "saude";
  if (/(obra|paviment|drenagem|via|infra|constru)/.test(t)) return "obras";
  if (/(educa|escola|matrícula|matricula|creche|ensino|aluno)/.test(t))
    return "educacao";
  return "saude";
}

function firstImageFromItem(item: Parser.Item): string {
  const enc = item.enclosure as { url?: string } | undefined;
  if (enc?.url && /\.(jpg|jpeg|png|webp|gif)/i.test(enc.url)) return enc.url;
  const html = item.content ?? "";
  const m = html.match(/src=["']([^"']+\.(jpg|jpeg|png|webp))["']/i);
  return m?.[1] ?? "";
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export type ParsedRssItem = {
  title: string;
  summary: string;
  imageUrl: string;
  sourceUrl: string;
  category: NewsCategory;
  publishedAt: Date | null;
};

export async function fetchRssItems(rssUrl: string): Promise<ParsedRssItem[]> {
  const feed = await parser.parseURL(rssUrl);
  const out: ParsedRssItem[] = [];

  for (const item of feed.items ?? []) {
    const title = (item.title ?? "").trim();
    const link = (item.link ?? String(item.guid ?? "")).trim();
    if (!title || !link) continue;

    const raw =
      item.contentSnippet ?? item.content ?? item.summary ?? "";
    const summary = stripHtml(raw).slice(0, 1200) || title;
    const imageUrl = firstImageFromItem(item);
    const category = inferCategory(title, summary);
    const publishedAt = item.pubDate ? new Date(item.pubDate) : null;

    out.push({
      title,
      summary,
      imageUrl,
      sourceUrl: link,
      category,
      publishedAt:
        publishedAt && !Number.isNaN(publishedAt.getTime())
          ? publishedAt
          : null,
    });
  }

  return out;
}
