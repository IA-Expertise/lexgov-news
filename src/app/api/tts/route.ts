import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug } from "@/config/tenants";
import { textToSpeechMp3, isElevenLabsConfigured } from "@/lib/elevenlabs";

/**
 * POST /api/tts
 * Converte texto em áudio MP3 via ElevenLabs em tempo real.
 * Body: { "text": "...", "tenantSlug": "louveira" } (tenantSlug opcional)
 * Retorna: audio/mpeg
 */
export async function POST(request: NextRequest) {
  if (!isElevenLabsConfigured()) {
    return NextResponse.json(
      { error: "ElevenLabs não configurado" },
      { status: 503 }
    );
  }

  let text = "";
  let tenantSlug = "";
  try {
    const body = await request.json();
    text = (body.text ?? "").trim();
    tenantSlug = String(body.tenantSlug ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "Texto vazio" }, { status: 400 });
  }

  const tenant = tenantSlug ? getTenantBySlug(tenantSlug) : undefined;
  const envVoice =
    tenant &&
    process.env[`ELEVENLABS_VOICE_ID_${tenant.slug.toUpperCase()}`]?.trim();
  const voiceId =
    envVoice ||
    tenant?.voiceId?.trim() ||
    process.env.ELEVENLABS_VOICE_ID_LOUVEIRA?.trim() ||
    "";

  if (!voiceId) {
    return NextResponse.json(
      { error: "Voice ID não configurado (tenant ou ELEVENLABS_VOICE_ID_*)" },
      { status: 503 }
    );
  }

  try {
    const mp3 = await textToSpeechMp3(text, voiceId);
    const out = new Uint8Array(mp3);
    return new NextResponse(out, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(out.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro TTS";
    console.error("[api/tts]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
