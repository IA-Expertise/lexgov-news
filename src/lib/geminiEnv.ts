/**
 * Chaves Gemini — ordem de preferência:
 * 1) GEMINI_API_KEY (padrão documentado)
 * 2) AI_INTEGRATIONS_GEMINI_API_KEY (Replit / integrações legadas)
 */

export function getGeminiApiKey(): string | undefined {
  const a = process.env.GEMINI_API_KEY?.trim();
  const b = process.env.AI_INTEGRATIONS_GEMINI_API_KEY?.trim();
  return a || b || undefined;
}

export function getGeminiBaseUrl(): string | undefined {
  const a = process.env.GEMINI_BASE_URL?.trim();
  const b = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL?.trim();
  return a || b || undefined;
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

/** Modelo para chat intermediário e classificação na ingestão (sobrescrevível). */
export function getGeminiModel(): string {
  return (
    process.env.GEMINI_MODEL?.trim() ||
    process.env.GEMINI_MODEL_ID?.trim() ||
    "gemini-2.5-flash"
  );
}
