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
  tenantSlug: string,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, tenantSlug }),
      signal,
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export function useNewsPlayback(tenantSlug: string) {
  /** Um único elemento <audio> — evita dois players HTML a tocar em paralelo. */
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  /** Incrementa a cada nova reprodução; callbacks antigos de TTS/áudio são ignorados. */
  const playbackGenRef = useRef(0);

  const getAudioEl = useCallback((): HTMLAudioElement => {
    if (!audioElRef.current) {
      audioElRef.current = new Audio();
      audioElRef.current.preload = "auto";
    }
    return audioElRef.current;
  }, []);

  const stopHtmlAudio = useCallback(() => {
    const a = audioElRef.current;
    if (a) {
      try {
        a.onended = null;
        a.onerror = null;
        a.pause();
        a.removeAttribute("src");
        a.load();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const cleanup = useCallback(() => {
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
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
      audioElRef.current = null;
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
      if (blobUrlRef.current && blobUrlRef.current !== blobUrl) {
        try {
          URL.revokeObjectURL(blobUrlRef.current);
        } catch {
          /* ignore */
        }
      }
      blobUrlRef.current = blobUrl;

      const a = getAudioEl();
      try {
        a.pause();
        a.src = blobUrl;
        a.load();
      } catch {
        /* ignore */
      }

      const done = () => {
        if (token !== playbackGenRef.current) return;
        stopHtmlAudio();
        if (blobUrlRef.current === blobUrl) {
          try {
            URL.revokeObjectURL(blobUrl);
          } catch {
            /* ignore */
          }
          blobUrlRef.current = null;
        }
        onEnd();
      };

      a.onended = () => done();
      a.onerror = () => done();
      void a.play().catch(() => done());
    },
    [getAudioEl, stopHtmlAudio]
  );

  const playUrlOnSameElement = useCallback(
    (src: string, token: number, onEnd: () => void, onFallback: () => void) => {
      const a = getAudioEl();
      try {
        a.pause();
        a.src = src;
        a.load();
      } catch {
        /* ignore */
      }

      const finishOk = () => {
        if (token !== playbackGenRef.current) return;
        stopHtmlAudio();
        onEnd();
      };

      a.onended = () => finishOk();
      a.onerror = () => {
        if (token !== playbackGenRef.current) return;
        stopHtmlAudio();
        onFallback();
      };
      void a.play().catch(() => {
        if (token !== playbackGenRef.current) return;
        stopHtmlAudio();
        onFallback();
      });
    },
    [getAudioEl, stopHtmlAudio]
  );

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

        const fallbackTts = () => {
          if (token !== playbackGenRef.current) return;
          const ac = new AbortController();
          ttsAbortRef.current = ac;
          void ttsToBlob(speechText(item), tenantSlug, ac.signal).then((blobUrl) => {
            if (token !== playbackGenRef.current) {
              if (blobUrl) URL.revokeObjectURL(blobUrl);
              return;
            }
            if (blobUrl) {
              playBlobUrl(blobUrl, token, finish);
            } else speakRobot(speechText(item), finish);
          });
        };

        playUrlOnSameElement(src, token, finish, fallbackTts);
        return;
      }

      const ac = new AbortController();
      ttsAbortRef.current = ac;
      const text = speechText(item);
      void ttsToBlob(text, tenantSlug, ac.signal).then((blobUrl) => {
        if (token !== playbackGenRef.current) {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          return;
        }
        if (blobUrl) {
          playBlobUrl(blobUrl, token, finish);
        } else speakRobot(text, finish);
      });
    },
    [cleanup, playBlobUrl, playUrlOnSameElement, tenantSlug]
  );

  const playOne = useCallback(
    (item: NewsItem, onEnd: () => void) => {
      const token = bumpPlaybackGeneration();
      playOneWithToken(item, token, onEnd);
    },
    [bumpPlaybackGeneration, playOneWithToken]
  );

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

  const playUrl = useCallback(
    (url: string, fallbackText: string, onEnd: () => void) => {
      const token = bumpPlaybackGeneration();
      cancelRobotSpeech();
      cleanup();

      const finish = () => {
        if (token === playbackGenRef.current) onEnd();
      };

      const src = resolveAudioSrc(url);

      const fallbackTts = () => {
        if (token !== playbackGenRef.current) return;
        const ac = new AbortController();
        ttsAbortRef.current = ac;
        void ttsToBlob(fallbackText, tenantSlug, ac.signal).then((blobUrl) => {
          if (token !== playbackGenRef.current) {
            if (blobUrl) URL.revokeObjectURL(blobUrl);
            return;
          }
          if (blobUrl) {
            playBlobUrl(blobUrl, token, finish);
          } else speakRobot(fallbackText, finish);
        });
      };

      playUrlOnSameElement(src, token, finish, fallbackTts);
    },
    [bumpPlaybackGeneration, cleanup, playBlobUrl, playUrlOnSameElement, tenantSlug]
  );

  const playParts = useCallback(
    (parts: string[], onEnd: () => void) => {
      const token = bumpPlaybackGeneration();
      cancelRobotSpeech();
      cleanup();

      const finish = () => {
        if (token === playbackGenRef.current) onEnd();
      };

      const ac = new AbortController();
      ttsAbortRef.current = ac;
      const joined = parts.join(" ");
      void ttsToBlob(joined, tenantSlug, ac.signal).then((blobUrl) => {
        if (token !== playbackGenRef.current) {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          return;
        }
        if (blobUrl) {
          playBlobUrl(blobUrl, token, finish);
        } else speakRobotParts(parts, finish);
      });
    },
    [bumpPlaybackGeneration, cleanup, playBlobUrl, tenantSlug]
  );

  const speak = useCallback(
    (text: string, onEnd: () => void) => {
      const token = bumpPlaybackGeneration();
      cancelRobotSpeech();
      cleanup();

      const finish = () => {
        if (token === playbackGenRef.current) onEnd();
      };

      const ac = new AbortController();
      ttsAbortRef.current = ac;
      void ttsToBlob(text, tenantSlug, ac.signal).then((blobUrl) => {
        if (token !== playbackGenRef.current) {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          return;
        }
        if (blobUrl) {
          playBlobUrl(blobUrl, token, finish);
        } else speakRobot(text, finish);
      });
    },
    [bumpPlaybackGeneration, cleanup, playBlobUrl, tenantSlug]
  );

  return { playOne, playUrl, playParts, playSequential, speak, cancelPlayback };
}
