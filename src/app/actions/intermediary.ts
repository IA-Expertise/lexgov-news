"use server";

import {
  isGeminiConfigured,
  runIntermediaryChat,
  type IntermediaryTurn,
} from "@/lib/agentIntermediary";

export type IntermediaryActionState =
  | { ok: true; reply: string; toolTrace?: { name: string; args: Record<string, unknown> }[] }
  | { ok: false; error: string };

/**
 * Usado pela página de demo — não exige Bearer; a chave Gemini fica só no servidor.
 */
export async function sendIntermediaryMessage(
  city: string,
  message: string,
  history: IntermediaryTurn[]
): Promise<IntermediaryActionState> {
  if (!isGeminiConfigured()) {
    return {
      ok: false,
      error:
        "Configure GEMINI_API_KEY (ou AI_INTEGRATIONS_GEMINI_API_KEY) no servidor para usar o intermediário.",
    };
  }

  const c = city?.trim();
  const m = message?.trim();
  if (!c) return { ok: false, error: "Cidade inválida." };
  if (!m) return { ok: false, error: "Digite uma mensagem." };

  try {
    const out = await runIntermediaryChat({
      city: c,
      message: m,
      history: history?.length ? history : undefined,
    });
    return {
      ok: true,
      reply: out.reply,
      toolTrace: out.toolTrace,
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : "Erro ao processar.";
    return { ok: false, error: err };
  }
}
