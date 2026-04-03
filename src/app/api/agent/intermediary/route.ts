import { NextRequest, NextResponse } from "next/server";
import {
  isGeminiConfigured,
  runIntermediaryChat,
  type IntermediaryTurn,
} from "@/lib/agentIntermediary";

/**
 * POST /api/agent/intermediary
 * Intermediário Gemini (demonstração): interpreta o pedido, chama listar_noticias e responde em PT-BR.
 * Body: { "city": "louveira", "message": "...", "history": [{ "role": "user"|"model", "text": "..." }] }
 * Auth opcional: mesmo Bearer de INGEST_SECRET ou AGENT_TOOL_SECRET (se algum estiver definido).
 */
export async function POST(request: NextRequest) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Integração Gemini não configurada no servidor" },
      { status: 503 }
    );
  }

  const secret =
    process.env.AGENT_TOOL_SECRET?.trim() || process.env.INGEST_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (token !== secret) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  let body: {
    city?: string;
    message?: string;
    history?: IntermediaryTurn[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const city = body.city?.trim();
  const message = body.message?.trim();
  if (!city) {
    return NextResponse.json(
      { error: "Parâmetro obrigatório: city" },
      { status: 400 }
    );
  }
  if (!message) {
    return NextResponse.json(
      { error: "Parâmetro obrigatório: message" },
      { status: 400 }
    );
  }

  const history = Array.isArray(body.history) ? body.history : undefined;

  try {
    const out = await runIntermediaryChat({ city, message, history });
    return NextResponse.json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao processar";
    console.error("[agent/intermediary]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
