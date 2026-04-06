import { NextRequest, NextResponse } from "next/server";
import { tenants } from "@/config/tenants";
import { attachTtsToArticleIfPossible } from "@/lib/ingestElevenlabs";
import { generateGreetingAudioForTenant } from "@/lib/liaGreetingIngest";
import { generateTop3Audio } from "@/lib/top3Audio";
import { prisma } from "@/lib/prisma";
import { getGeminiApiKey } from "@/lib/geminiEnv";
import { classifyNewsCategoryForIngest } from "@/lib/geminiCategoryClassifier";
import { fetchRssItems } from "@/lib/rssIngest";

/**
 * POST /api/ingest
 * Header: Authorization: Bearer <INGEST_SECRET>
 * Body opcional: { "tenantSlug": "louveira", "forceTts": true, "useGeminiCategory": true }
 * — `useGeminiCategory` força classificação Gemini por item (requer GEMINI_API_KEY).
 * — `INGEST_USE_GEMINI_CATEGORY=true` liga o mesmo comportamento por padrão.
 *
 * Busca RSS de cada cidade, faz upsert por sourceUrl e grava no PostgreSQL.
 * O campo `summary` pode vir enriquecido (HTML da matéria em louveira.sp.gov.br/conteudo/…)
 * quando o feed não traz descrição — ver `enrichSummaryFromLouveiraArticle` em rssIngest.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  if (!secret?.trim()) {
    return NextResponse.json(
      { error: "INGEST_SECRET não configurado" },
      { status: 503 }
    );
  }

  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL não configurado" },
      { status: 503 }
    );
  }

  let body: {
    tenantSlug?: string;
    forceTts?: boolean;
    useGeminiCategory?: boolean;
  } = {};
  try {
    const t = await request.text();
    if (t)
      body = JSON.parse(t) as {
        tenantSlug?: string;
        forceTts?: boolean;
        useGeminiCategory?: boolean;
      };
  } catch {
    body = {};
  }

  const useGeminiCategory =
    body.useGeminiCategory === true ||
    (process.env.INGEST_USE_GEMINI_CATEGORY === "true" &&
      Boolean(getGeminiApiKey()));

  const list = body.tenantSlug
    ? Object.values(tenants).filter((x) => x.slug === body.tenantSlug)
    : Object.values(tenants);

  const counts: Record<string, number> = {};

  for (const tenant of list) {
    let n = 0;
    const items = await fetchRssItems(tenant.rssUrl);
    for (const item of items.slice(0, 40)) {
      const category = await classifyNewsCategoryForIngest(item.title, item.summary, {
        useGemini: useGeminiCategory,
      });
      const row = await prisma.newsArticle.upsert({
        where: { sourceUrl: item.sourceUrl },
        create: {
          tenantSlug: tenant.slug,
          category,
          title: item.title,
          summary: item.summary,
          imageUrl: item.imageUrl,
          sourceUrl: item.sourceUrl,
          publishedAt: item.publishedAt,
        },
        update: {
          title: item.title,
          summary: item.summary,
          imageUrl: item.imageUrl,
          category,
          publishedAt: item.publishedAt,
        },
      });
      await attachTtsToArticleIfPossible(
        row.id,
        tenant,
        row.title,
        row.summary,
        { force: body.forceTts === true }
      );
      n += 1;
    }
    counts[tenant.slug] = n;
    // Regrava o áudio da lista top-3 sempre que o ingest roda
    await generateTop3Audio(tenant).catch((e) =>
      console.error("[ingest top3]", e)
    );
    await generateGreetingAudioForTenant(tenant).catch((e) =>
      console.error("[ingest greeting]", e)
    );
  }

  return NextResponse.json({ ok: true, ingested: counts });
}
