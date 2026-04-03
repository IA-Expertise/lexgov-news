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
  /** Incrementa a cada nova reprodução; callbacks antigos de TTS/áudio são ignorados (evita voz dobrada). */
  const playbackGenRef = useRef(0);

  const stopHtmlAudio = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      try {
        a.pause();
        a.removeAttribute("src");
        a.load();
      } catch {
        /* ignore */
      }
    }
    audioRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    stopHtmlAudio();
    if (blobUrlRef.current) {
      try {
        URL.revokeObjectURL(blobUrlRef.current);
      } catch {
        /* ignore */
      }
      blobUrlRef.current = null;
    }
  }, [stopHtmlAudio]);

  const bumpPlaybackGeneration = useCallback(() => {
    playbackGenRef.current += 1;
    return playbackGenRef.current;
  }, []);

  const cancelPlayback = useCallback(() => {
    bumpPlaybackGeneration();
    cleanup();
    cancelRobotSpeech();
  }, [bumpPlaybackGeneration, cleanup]);

  useEffect(() => {
    return () => {
      bumpPlaybackGeneration();
      cleanup();
      cancelRobotSpeech();
    };
  }, [bumpPlaybackGeneration, cleanup]);

  const playBlobUrl = useCallback(
    (blobUrl: string, token: number, onEnd: () => void) => {
      if (token !== playbackGenRef.current) {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {
          /* ignore */
        }
        return;
      }
      const a = new Audio(blobUrl);
      audioRef.current = a;
      const done = () => {
        if (token !== playbackGenRef.current) return;
        cleanup();
        onEnd();
      };
      a.onended = () => done();
      a.onerror = () => done();
      void a.play().catch(() => done());
    },
    [cleanup]
  );

  /**
   * Um artigo com token fixo (não incrementa geração).
   * Usado por playOne e por playSequential com o mesmo token em toda a fila.
   */
  const playOneWithToken = useCallback(
    (item: NewsItem, token: number, onEnd: () => void) => {
      cancelRobotSpeech();
      cleanup();

      const finish = () => {
        if (token === playbackGenRef.current) onEnd();
      };

      const preGenUrl = item.audioUrl?.trim();
      if (preGenUrl) {
        const src = resolveAudioSrc(preGenUrl);
        const a = new Audio(src);
        audioRef.current = a;

        const fallbackTts = () => {
          if (token !== playbackGenRef.current) return;
          stopHtmlAudio();
          void ttsToBlob(speechText(item), tenantSlug).then((blobUrl) => {
            if (token !== playbackGenRef.current) {
              if (blobUrl) URL.revokeObjectURL(blobUrl);
              return;
            }
            if (blobUrl) {
              blobUrlRef.current = blobUrl;
              playBlobUrl(blobUrl, token, finish);
            } else speakRobot(speechText(item), finish);
          });
        };

        a.onended = () => {
          if (token !== playbackGenRef.current) return;
          stopHtmlAudio();
          finish();
        };
        a.onerror = () => {
          fallbackTts();
        };
        void a.play().catch(() => {
          fallbackTts();
        });
        return;
      }

      const text = speechText(item);
      void ttsToBlob(text, tenantSlug).then((blobUrl) => {
        if (token !== playbackGenRef.current) {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          return;
        }
        if (blobUrl) {
          blobUrlRef.current = blobUrl;
          playBlobUrl(blobUrl, token, finish);
        } else speakRobot(text, finish);
      });
    },
    [cleanup, playBlobUrl, stopHtmlAudio, tenantSlug]
  );

  /** Reproduz um artigo: MP3 pré-gravado → ElevenLabs real-time → navegador */
  const playOne = useCallback(
    (item: NewsItem, onEnd: () => void) => {
      const token = bumpPlaybackGeneration();
      playOneWithToken(item, token, onEnd);
    },
    [bumpPlaybackGeneration, playOneWithToken]
  );

  /**
   * Vários artigos em sequência — cada um usa o MP3 da notícia quando existir,
   * alinhado aos títulos mostrados na tela. Uma única geração de playback para não cortar o áudio.
   */
  const playSequential = useCallback(
    (items: NewsItem[], onEnd: () => void) => {
      if (!items.length) {
        onEnd();
        return;
      }
      const token = bumpPlaybackGeneration();
      let i = 0;
      const next = () => {
        if (token !== playbackGenRef.current) return;
        if (i >= items.length) {
          onEnd();
          return;
        }
        const item = items[i++];
        playOneWithToken(item, token, next);
      };
      next();
    },
    [bumpPlaybackGeneration, playOneWithToken]
  );

  /**
   * Tenta reproduzir uma URL de áudio pré-gravado.
   * Se falhar, gera o áudio via ElevenLabs com `fallbackText`.
   */
  const playUrl = useCallback(
    (url: string, fallbackText: string, onEnd: () => void) => {
      const token = bumpPlaybackGeneration();
      cancelRobotSpeech();
      cleanup();

      const finish = () => {
        if (token === playbackGenRef.current) onEnd();
      };

      const src = resolveAudioSrc(url);
      const a = new Audio(src);
      audioRef.current = a;

      const fallbackTts = () => {
        if (token !== playbackGenRef.current) return;
        stopHtmlAudio();
        void ttsToBlob(fallbackText, tenantSlug).then((blobUrl) => {
          if (token !== playbackGenRef.current) {
            if (blobUrl) URL.revokeObjectURL(blobUrl);
            return;
          }
          if (blobUrl) {
            blobUrlRef.current = blobUrl;
            playBlobUrl(blobUrl, token, finish);
          } else speakRobot(fallbackText, finish);
        });
      };

      a.onended = () => {
        if (token !== playbackGenRef.current) return;
        stopHtmlAudio();
        finish();
      };
      a.onerror = () => fallbackTts();
      void a.play().catch(() => fallbackTts());
    },
    [bumpPlaybackGeneration, cleanup, playBlobUrl, stopHtmlAudio, tenantSlug]
  );

  /** Reproduz uma lista de frases em sequência: ElevenLabs (texto unido) → navegador */
  const playParts = useCallback(
    (parts: string[], onEnd: () => void) => {
      const token = bumpPlaybackGeneration();
      cancelRobotSpeech();
      cleanup();

      const finish = () => {
        if (token === playbackGenRef.current) onEnd();
      };

      const joined = parts.join(" ");
      void ttsToBlob(joined, tenantSlug).then((blobUrl) => {
        if (token !== playbackGenRef.current) {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          return;
        }
        if (blobUrl) {
          blobUrlRef.current = blobUrl;
          playBlobUrl(blobUrl, token, finish);
        } else speakRobotParts(parts, finish);
      });
    },
    [bumpPlaybackGeneration, cleanup, playBlobUrl, tenantSlug]
  );

  /** Fala um texto simples: ElevenLabs real-time → navegador */
  const speak = useCallback(
    (text: string, onEnd: () => void) => {
      const token = bumpPlaybackGeneration();
      cancelRobotSpeech();
      cleanup();

      const finish = () => {
        if (token === playbackGenRef.current) onEnd();
      };

      void ttsToBlob(text, tenantSlug).then((blobUrl) => {
        if (token !== playbackGenRef.current) {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          return;
        }
        if (blobUrl) {
          blobUrlRef.current = blobUrl;
          playBlobUrl(blobUrl, token, finish);
        } else speakRobot(text, finish);
      });
    },
    [bumpPlaybackGeneration, cleanup, playBlobUrl, tenantSlug]
  );

  return { playOne, playUrl, playParts, playSequential, speak, cancelPlayback };
}
