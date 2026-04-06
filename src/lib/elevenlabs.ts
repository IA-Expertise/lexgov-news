/**
 * Text-to-Speech ElevenLabs (server-side).
 * Use o voice ID da conta (ex.: em ElevenLabs → Voice library), não o nome amigável.
 */

const API = "https://api.elevenlabs.io/v1";

export function isElevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
}

/** Texto limitado para controlar custo. Flash v2.5: baixa latência, multilíngue (inclui PT-BR). */
const MAX_CHARS = 4_500;

export async function textToSpeechMp3(
  text: string,
  voiceId: string
): Promise<Buffer> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY ausente");

  const trimmed = text.replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
  if (!trimmed.length) throw new Error("Texto vazio para TTS");

  const modelId =
    process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_flash_v2_5";

  const res = await fetch(`${API}/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: trimmed,
      model_id: modelId,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`ElevenLabs TTS ${res.status}: ${err.slice(0, 200)}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) throw new Error("Resposta de áudio inválida");
  return buf;
}
