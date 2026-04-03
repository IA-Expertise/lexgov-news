import Parser from "rss-parser";
import type { NewsCategory } from "@/mocks/news";

const parser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent": "LexGov-News/1.0 (RSS ingestão municipal)",
  },
  customFields: {
    item: ["media:content", "media:thumbnail"],
  },
});

const FETCH_HEADERS = {
  "User-Agent": "LexGov-News/1.0 (RSS ingestão municipal)",
  Accept: "text/html,application/xhtml+xml",
};

function inferCategory(title: string, body: string): NewsCategory {
  const t = `${title} ${body}`.toLowerCase();
  if (/(saúde|saude|hospital|vacina|dengue|posto|ubs)/.test(t)) return "saude";
  if (/(obra|paviment|drenagem|via|infra|constru)/.test(t)) return "obras";
  if (/(educa|escola|matrícula|matricula|creche|ensino|aluno)/.test(t))
    return "educacao";
  return "saude";
}

type MediaTag = { $?: { url?: string; medium?: string } };

function mediaContentUrl(item: Parser.Item): string {
  const r = item as Record<string, unknown>;
  const raw = r["media:content"] ?? r["mediaContent"];
  const pick = (node: unknown): string => {
    if (!node || typeof node !== "object") return "";
    const tag = node as MediaTag;
    const u = tag.$?.url;
    return typeof u === "string" && u.length > 0 ? u : "";
  };
  if (Array.isArray(raw)) {
    for (const x of raw) {
      const u = pick(x);
      if (u) return u;
    }
    return "";
  }
  return pick(raw);
}

function firstImageFromItem(item: Parser.Item): string {
  const fromMedia = mediaContentUrl(item);
  if (fromMedia) return fromMedia;

  const enc = item.enclosure as { url?: string } | undefined;
  if (enc?.url && /\.(jpg|jpeg|png|webp|gif)/i.test(enc.url)) return enc.url;

  const r = item as Record<string, unknown>;
  const html = item.content ?? (r["content:encoded"] as string | undefined) ?? "";
  const m = String(html).match(/src=["']([^"']+\.(jpg|jpeg|png|webp))["']/i);
  return m?.[1] ?? "";
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Parágrafos <p> com texto útil (>50 chars após limpar HTML) */
function extractArticleParagraphs(html: string): string {
  const parts: string[] = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = stripHtml(m[1] ?? "");
    if (text.length > 50) parts.push(text);
  }
  return parts.join(" ").trim();
}

function isLouveiraConteudoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname === "louveira.sp.gov.br" && u.pathname.startsWith("/conteudo/")
    );
  } catch {
    return false;
  }
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: FETCH_HEADERS,
    });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Busca HTML da matéria e extrai texto dos <p> (Louveira).
 * Falha/timeout → retorna null (caller usa título).
 */
export async function enrichSummaryFromLouveiraArticle(
  sourceUrl: string
): Promise<string | null> {
  if (!isLouveiraConteudoUrl(sourceUrl)) return null;

  try {
    const res = await fetchWithTimeout(sourceUrl, 5000);
    if (!res.ok) return null;
    const html = await res.text();
    const text = extractArticleParagraphs(html);
    if (text.length < 50) return null;
    return text.slice(0, 1500);
  } catch {
    return null;
  }
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
    let summary = stripHtml(raw).slice(0, 1200) || title;

    if (summary.trim() === title.trim()) {
      const enriched = await enrichSummaryFromLouveiraArticle(link);
      summary = enriched ?? title;
    }

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
