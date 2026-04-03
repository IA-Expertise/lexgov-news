import { NextRequest, NextResponse } from "next/server";
import { getNewsByTenantSlug } from "@/mocks/news";

/**
 * GET /api/news?city=louveira
 *
 * Retorno atual: lista filtrada de `news.ts` (mock).
 *
 * Integração futura:
 * - Cache em PostgreSQL: após ingestão do RSS, ler artigos + URLs de áudio gerados.
 * - ElevenLabs: em produção, `audioUrl` virá da fila de síntese (voiceId do tenant em tenants.ts).
 * - Invalidação: webhook ou cron de re-ingestão ao publicar no portal da prefeitura.
 */
export function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city");
  if (!city?.trim()) {
    return NextResponse.json(
      { error: "Parâmetro obrigatório: city" },
      { status: 400 }
    );
  }

  const items = getNewsByTenantSlug(city.trim());
  return NextResponse.json({ city: city.trim().toLowerCase(), items });
}
