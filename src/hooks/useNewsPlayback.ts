"use client";

import { useCallback, useEffect, useRef } from "react";
import type { NewsItem } from "@/mocks/news";
import { speechText } from "@/lib/newsSpeech";
import { cancelRobotSpeech, speakRobot, speakRobotParts } from "@/lib/robotSpeech";

function resolveAudioSrc(audioUrl: string): string {
  const u = audioUrl.trim();
  if (u.startsWith("http")) return u;
  if (typeof window !== "undefined")
    return `${window.location.origin}${u.startsWith("/") ? u : `/${u}`}`;
  return u;
}

async function ttsToBlob(text: string): Promise<string | null> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export function useNewsPlayback() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      cancelRobotSpeech();
    };
  }, [cleanup]);

  const playBlobUrl = useCallback(
    (blobUrl: string, onEnd: () => void) => {
      const a = new Audio(blobUrl);
      audioRef.current = a;
      a.onended = () => { cleanup(); onEnd(); };
      a.onerror = () => { cleanup(); onEnd(); };
      void a.play().catch(() => { cleanup(); onEnd(); });
    },
    [cleanup]
  );

  /** Reproduz um artigo: MP3 pré-gravado → ElevenLabs real-time → navegador */
  const playOne = useCallback(
    (item: NewsItem, onEnd: () => void) => {
      cancelRobotSpeech();
      cleanup();

      const preGenUrl = item.audioUrl?.trim();
      if (preGenUrl) {
        const src = resolveAudioSrc(preGenUrl);
        const a = new Audio(src);
        audioRef.current = a;
        a.onended = () => { audioRef.current = null; onEnd(); };
        a.onerror = () => {
          audioRef.current = null;
          speakRobot(speechText(item), onEnd);
        };
        void a.play().catch(() => speakRobot(speechText(item), onEnd));
        return;
      }

      const text = speechText(item);
      void ttsToBlob(text).then((blobUrl) => {
        if (blobUrl) { blobUrlRef.current = blobUrl; playBlobUrl(blobUrl, onEnd); }
        else speakRobot(text, onEnd);
      });
    },
    [cleanup, playBlobUrl]
  );

  /**
   * Tenta reproduzir uma URL de áudio pré-gravado.
   * Se falhar, gera o áudio via ElevenLabs real-time com `fallbackText`.
   */
  const playUrl = useCallback(
    (url: string, fallbackText: string, onEnd: () => void) => {
      cancelRobotSpeech();
      cleanup();

      const src = resolveAudioSrc(url);
      const a = new Audio(src);
      audioRef.current = a;

      a.onended = () => { audioRef.current = null; onEnd(); };
      a.onerror = () => {
        audioRef.current = null;
        // Fallback: ElevenLabs real-time → navegador
        void ttsToBlob(fallbackText).then((blobUrl) => {
          if (blobUrl) { blobUrlRef.current = blobUrl; playBlobUrl(blobUrl, onEnd); }
          else speakRobot(fallbackText, onEnd);
        });
      };

      void a.play().catch(() => {
        audioRef.current = null;
        void ttsToBlob(fallbackText).then((blobUrl) => {
          if (blobUrl) { blobUrlRef.current = blobUrl; playBlobUrl(blobUrl, onEnd); }
          else speakRobot(fallbackText, onEnd);
        });
      });
    },
    [cleanup, playBlobUrl]
  );

  /** Reproduz uma lista de frases em sequência: ElevenLabs (texto unido) → navegador */
  const playParts = useCallback(
    (parts: string[], onEnd: () => void) => {
      cancelRobotSpeech();
      cleanup();

      const joined = parts.join(" ");
      void ttsToBlob(joined).then((blobUrl) => {
        if (blobUrl) { blobUrlRef.current = blobUrl; playBlobUrl(blobUrl, onEnd); }
        else speakRobotParts(parts, onEnd);
      });
    },
    [cleanup, playBlobUrl]
  );

  /** Fala um texto simples: ElevenLabs real-time → navegador */
  const speak = useCallback(
    (text: string, onEnd: () => void) => {
      cancelRobotSpeech();
      cleanup();

      void ttsToBlob(text).then((blobUrl) => {
        if (blobUrl) { blobUrlRef.current = blobUrl; playBlobUrl(blobUrl, onEnd); }
        else speakRobot(text, onEnd);
      });
    },
    [cleanup, playBlobUrl]
  );

  return { playOne, playUrl, playParts, speak };
}
