"use client";

import { useCallback, useEffect, useRef } from "react";
import type { NewsItem } from "@/mocks/news";
import { speechText } from "@/lib/newsSpeech";
import { cancelRobotSpeech, speakRobot, speakRobotParts } from "@/lib/robotSpeech";

function resolveAudioSrc(audioUrl: string): string {
  const u = audioUrl.trim();
  if (u.startsWith("http")) return u;
  if (typeof window !== "undefined") return `${window.location.origin}${u.startsWith("/") ? u : `/${u}`}`;
  return u;
}

/**
 * Prioriza MP3 pré-gerado (ElevenLabs na ingestão); fallback TTS do navegador.
 */
export function useNewsPlayback() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      cancelRobotSpeech();
    };
  }, []);

  const playOne = useCallback((item: NewsItem, onEnd: () => void) => {
    cancelRobotSpeech();
    audioRef.current?.pause();
    audioRef.current = null;

    const url = item.audioUrl?.trim();
    if (url) {
      const a = new Audio(resolveAudioSrc(url));
      audioRef.current = a;
      a.onended = () => {
        audioRef.current = null;
        onEnd();
      };
      a.onerror = () => {
        audioRef.current = null;
        speakRobot(speechText(item), onEnd);
      };
      void a.play().catch(() => speakRobot(speechText(item), onEnd));
      return;
    }

    speakRobot(speechText(item), onEnd);
  }, []);

  const playParts = useCallback((parts: string[], onEnd: () => void) => {
    audioRef.current?.pause();
    audioRef.current = null;
    speakRobotParts(parts, onEnd);
  }, []);

  return { playOne, playParts };
}
