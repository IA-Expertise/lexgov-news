"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceStatus = "idle" | "listening" | "unsupported";

type UseVoiceUtteranceOptions = {
  enabled: boolean;
  /**
   * Se true (padrão): uma única tomada de fala; não reinicia após silêncio.
   * Se false: reinicia após cada ciclo (ex.: escuta contínua de palavra-chave).
   */
  oneShot?: boolean;
  onUtterance: (text: string) => void;
  /** Chamado em modo oneShot quando o ciclo termina sem texto (silêncio/timeout) ou erro. */
  onListeningEnd?: (reason: "silence" | "error") => void;
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
  oneShot = true,
  onUtterance,
  onListeningEnd,
}: UseVoiceUtteranceOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [lastHeard, setLastHeard] = useState<string>("");
  const recRef = useRef<SpeechRecLike | null>(null);
  const heardRef = useRef(false);
  const enabledRef = useRef(enabled);
  const oneShotRef = useRef(oneShot);
  const onUtteranceRef = useRef(onUtterance);
  const onListeningEndRef = useRef(onListeningEnd);
  onUtteranceRef.current = onUtterance;
  onListeningEndRef.current = onListeningEnd;
  enabledRef.current = enabled;
  oneShotRef.current = oneShot;

  const stop = useCallback(() => {
    const r = recRef.current;
    if (r) {
      try {
        r.onend = null;
        r.abort();
      } catch {
        try { r.stop(); } catch { /* ignore */ }
      }
      recRef.current = null;
    }
    setStatus((s) => (s === "unsupported" ? s : "idle"));
  }, []);

  const bindRecognition = useCallback((rec: SpeechRecLike) => {
    heardRef.current = false;
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (ev: SpeechRecognitionEventLike) => {
      const last = ev.results[ev.results.length - 1];
      const text = last?.[0]?.transcript?.trim() ?? "";
      if (!text) return;

      heardRef.current = true;

      if (oneShotRef.current) {
        rec.onend = null;
        rec.onerror = null;
        recRef.current = null;
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
        setStatus("idle");
      }

      setLastHeard(text);
      onUtteranceRef.current(text);
    };

    rec.onerror = () => {
      if (recRef.current !== rec) return;
      recRef.current = null;
      setStatus("idle");
      if (oneShotRef.current) {
        onListeningEndRef.current?.("error");
      }
    };

    rec.onend = () => {
      if (recRef.current !== rec) return;
      if (!enabledRef.current) {
        setStatus("idle");
        return;
      }

      if (oneShotRef.current) {
        if (!heardRef.current) {
          recRef.current = null;
          setStatus("idle");
          onListeningEndRef.current?.("silence");
        }
        return;
      }

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
