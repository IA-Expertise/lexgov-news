import { NextRequest, NextResponse } from "next/server";
import { fetchNewsForAgent } from "@/lib/agentNewsData";

/**
 * GET /api/agent/news?city=louveira&q=esporte&limit=5
 * Ferramenta para agente externo listar notícias com filtros.
 * Proteção opcional: mesmo Bearer de INGEST_SECRET ou AGENT_TOOL_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret =
    process.env.AGENT_TOOL_SECRET?.trim() || process.env.INGEST_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (token !== secret) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  const city = request.nextUrl.searchParams.get("city");
  if (!city?.trim()) {
    return NextResponse.json(
      { error: "Parâmetro obrigatório: city" },
      { status: 400 }
    );
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(
    25,
    Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "8", 10) || 8)
  );

  const { items, city: c, query } = await fetchNewsForAgent(city.trim(), {
    q,
    limit,
  });

  return NextResponse.json({
    city: c,
    query,
    count: items.length,
    items,
  });
}
