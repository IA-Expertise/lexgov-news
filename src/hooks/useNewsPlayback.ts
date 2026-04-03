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

async function ttsToBlob(
  text: string,
  tenantSlug: string
): Promise<string | null> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, tenantSlug }),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export function useNewsPlayback(tenantSlug: string) {
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

  const cancelPlayback = useCallback(() => {
    cleanup();
    cancelRobotSpeech();
  }, [cleanup]);

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
      a.onended = () => {
        cleanup();
        onEnd();
      };
      a.onerror = () => {
        cleanup();
        onEnd();
      };
      void a.play().catch(() => {
        cleanup();
        onEnd();
      });
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
        a.onended = () => {
          audioRef.current = null;
          onEnd();
        };
        a.onerror = () => {
          audioRef.current = null;
          void ttsToBlob(speechText(item), tenantSlug).then((blobUrl) => {
            if (blobUrl) {
              blobUrlRef.current = blobUrl;
              playBlobUrl(blobUrl, onEnd);
            } else speakRobot(speechText(item), onEnd);
          });
        };
        void a.play().catch(() => {
          void ttsToBlob(speechText(item), tenantSlug).then((blobUrl) => {
            if (blobUrl) {
              blobUrlRef.current = blobUrl;
              playBlobUrl(blobUrl, onEnd);
            } else speakRobot(speechText(item), onEnd);
          });
        });
        return;
      }

      const text = speechText(item);
      void ttsToBlob(text, tenantSlug).then((blobUrl) => {
        if (blobUrl) {
          blobUrlRef.current = blobUrl;
          playBlobUrl(blobUrl, onEnd);
        } else speakRobot(text, onEnd);
      });
    },
    [cleanup, playBlobUrl, tenantSlug]
  );

  /**
   * Vários artigos em sequência — cada um usa o MP3 da notícia quando existir,
   * alinhado aos títulos mostrados na tela.
   */
  const playSequential = useCallback(
    (items: NewsItem[], onEnd: () => void) => {
      if (!items.length) {
        onEnd();
        return;
      }
      let i = 0;
      const next = () => {
        if (i >= items.length) {
          onEnd();
          return;
        }
        const item = items[i++];
        playOne(item, next);
      };
      next();
    },
    [playOne]
  );

  /**
   * Tenta reproduzir uma URL de áudio pré-gravado.
   * Se falhar, gera o áudio via ElevenLabs com `fallbackText`.
   */
  const playUrl = useCallback(
    (url: string, fallbackText: string, onEnd: () => void) => {
      cancelRobotSpeech();
      cleanup();

      const src = resolveAudioSrc(url);
      const a = new Audio(src);
      audioRef.current = a;

      a.onended = () => {
        audioRef.current = null;
        onEnd();
      };
      a.onerror = () => {
        audioRef.current = null;
        void ttsToBlob(fallbackText, tenantSlug).then((blobUrl) => {
          if (blobUrl) {
            blobUrlRef.current = blobUrl;
            playBlobUrl(blobUrl, onEnd);
          } else speakRobot(fallbackText, onEnd);
        });
      };

      void a.play().catch(() => {
        audioRef.current = null;
        void ttsToBlob(fallbackText, tenantSlug).then((blobUrl) => {
          if (blobUrl) {
            blobUrlRef.current = blobUrl;
            playBlobUrl(blobUrl, onEnd);
          } else speakRobot(fallbackText, onEnd);
        });
      });
    },
    [cleanup, playBlobUrl, tenantSlug]
  );

  /** Reproduz uma lista de frases em sequência: ElevenLabs (texto unido) → navegador */
  const playParts = useCallback(
    (parts: string[], onEnd: () => void) => {
      cancelRobotSpeech();
      cleanup();

      const joined = parts.join(" ");
      void ttsToBlob(joined, tenantSlug).then((blobUrl) => {
        if (blobUrl) {
          blobUrlRef.current = blobUrl;
          playBlobUrl(blobUrl, onEnd);
        } else speakRobotParts(parts, onEnd);
      });
    },
    [cleanup, playBlobUrl, tenantSlug]
  );

  /** Fala um texto simples: ElevenLabs real-time → navegador */
  const speak = useCallback(
    (text: string, onEnd: () => void) => {
      cancelRobotSpeech();
      cleanup();

      void ttsToBlob(text, tenantSlug).then((blobUrl) => {
        if (blobUrl) {
          blobUrlRef.current = blobUrl;
          playBlobUrl(blobUrl, onEnd);
        } else speakRobot(text, onEnd);
      });
    },
    [cleanup, playBlobUrl, tenantSlug]
  );

  return { playOne, playUrl, playParts, playSequential, speak, cancelPlayback };
}
