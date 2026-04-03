"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceStatus = "idle" | "listening" | "unsupported";

type UseVoiceUtteranceOptions = {
  enabled: boolean;
  /** Texto completo reconhecido — a intenção é interpretada no componente (voiceIntent) */
  onUtterance: (text: string) => void;
};

/** Tipagem mínima — APIs de fala não estão em todos os ambientes de build */
type SpeechRecLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<{ 0?: { transcript?: string } }>;
};

function createRecognition(): SpeechRecLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecLike;
    webkitSpeechRecognition?: new () => SpeechRecLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function useVoiceUtterance({
  enabled,
  onUtterance,
}: UseVoiceUtteranceOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [lastHeard, setLastHeard] = useState<string>("");
  const recRef = useRef<SpeechRecLike | null>(null);
  const enabledRef = useRef(enabled);
  const onUtteranceRef = useRef(onUtterance);
  onUtteranceRef.current = onUtterance;
  enabledRef.current = enabled;

  const stop = useCallback(() => {
    const r = recRef.current;
    if (r) {
      try {
        r.onend = null;
        r.abort();
      } catch {
        try {
          r.stop();
        } catch {
          /* ignore */
        }
      }
      recRef.current = null;
    }
    setStatus((s) => (s === "unsupported" ? s : "idle"));
  }, []);

  const bindRecognition = useCallback((rec: SpeechRecLike) => {
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (ev: SpeechRecognitionEventLike) => {
      const last = ev.results[ev.results.length - 1];
      const text = last?.[0]?.transcript?.trim() ?? "";
      if (!text) return;
      // Fecha o microfone imediatamente — impede o onend de reiniciar
      // enquanto a LIA responde. Quando o áudio terminar (enabled volta a true)
      // o useEffect chama start() novamente de forma controlada.
      rec.onend = null;
      rec.onerror = null;
      recRef.current = null;
      try { rec.abort(); } catch { /* ignore */ }
      setStatus("idle");
      setLastHeard(text);
      onUtteranceRef.current(text);
    };

    rec.onerror = () => {
      if (recRef.current !== rec) return;
      setStatus("idle");
    };

    rec.onend = () => {
      if (recRef.current !== rec) return;
      if (!enabledRef.current) {
        setStatus("idle");
        return;
      }
      // Reinicia apenas se nenhum resultado foi capturado (silêncio/timeout)
      try {
        rec.start();
      } catch {
        setStatus("idle");
      }
    };
  }, []);

  const start = useCallback(() => {
    const rec = createRecognition();
    if (!rec) {
      setStatus("unsupported");
      return;
    }
    stop();
    bindRecognition(rec);
    recRef.current = rec;
    try {
      rec.start();
      setStatus("listening");
    } catch {
      setStatus("idle");
    }
  }, [bindRecognition, stop]);

  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }
    start();
    return () => stop();
  }, [enabled, start, stop]);

  return { status, lastHeard, start, stop };
}

/** @deprecated use useVoiceUtterance */
export const useVoiceCategory = useVoiceUtterance;
