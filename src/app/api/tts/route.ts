import { NextRequest, NextResponse } from "next/server";
import { textToSpeechMp3, isElevenLabsConfigured } from "@/lib/elevenlabs";

/**
 * POST /api/tts
 * Converte texto em áudio MP3 via ElevenLabs em tempo real.
 * Body: { "text": "..." }
 * Retorna: audio/mpeg
 */
export async function POST(request: NextRequest) {
  if (!isElevenLabsConfigured()) {
    return NextResponse.json(
      { error: "ElevenLabs não configurado" },
      { status: 503 }
    );
  }

  const voiceId =
    process.env.ELEVENLABS_VOICE_ID_LOUVEIRA?.trim() || "";
  if (!voiceId) {
    return NextResponse.json(
      { error: "Voice ID não configurado" },
      { status: 503 }
    );
  }

  let text = "";
  try {
    const body = await request.json();
    text = (body.text ?? "").trim();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "Texto vazio" }, { status: 400 });
  }

  try {
    const mp3 = await textToSpeechMp3(text, voiceId);
    const body = new Uint8Array(mp3);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(body.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro TTS";
    console.error("[api/tts]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
