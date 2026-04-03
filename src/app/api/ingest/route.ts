import { NextRequest, NextResponse } from "next/server";
import { tenants } from "@/config/tenants";
import { prisma } from "@/lib/prisma";
import { fetchRssItems } from "@/lib/rssIngest";

/**
 * POST /api/ingest
 * Header: Authorization: Bearer <INGEST_SECRET>
 * Body opcional: { "tenantSlug": "louveira" } — omite para todos os tenants.
 *
 * Busca RSS de cada cidade, faz upsert por sourceUrl e grava no PostgreSQL.
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

  let body: { tenantSlug?: string } = {};
  try {
    const t = await request.text();
    if (t) body = JSON.parse(t) as { tenantSlug?: string };
  } catch {
    body = {};
  }

  const list = body.tenantSlug
    ? Object.values(tenants).filter((x) => x.slug === body.tenantSlug)
    : Object.values(tenants);

  const counts: Record<string, number> = {};

  for (const tenant of list) {
    let n = 0;
    const items = await fetchRssItems(tenant.rssUrl);
    for (const item of items.slice(0, 40)) {
      await prisma.newsArticle.upsert({
        where: { sourceUrl: item.sourceUrl },
        create: {
          tenantSlug: tenant.slug,
          category: item.category,
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
          category: item.category,
          publishedAt: item.publishedAt,
        },
      });
      n += 1;
    }
    counts[tenant.slug] = n;
  }

  return NextResponse.json({ ok: true, ingested: counts });
}
