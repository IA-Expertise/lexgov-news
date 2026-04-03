import { NextRequest, NextResponse } from "next/server";
import { getNewsForTenant } from "@/lib/newsStore";

/**
 * GET /api/news?city=louveira
 *
 * PostgreSQL quando `DATABASE_URL` + ingestão RSS; senão mocks (`news.ts`).
 * ElevenLabs: em produção, enriquecer `audioUrl` na ingestão ou em job separado.
 */
export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city");
  if (!city?.trim()) {
    return NextResponse.json(
      { error: "Parâmetro obrigatório: city" },
      { status: 400 }
    );
  }

  const slug = city.trim().toLowerCase();
  const items = await getNewsForTenant(slug);
  return NextResponse.json({ city: slug, items });
}
