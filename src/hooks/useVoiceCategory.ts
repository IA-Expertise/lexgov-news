"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NewsCategory } from "@/mocks/news";

export type VoiceStatus = "idle" | "listening" | "unsupported";

type UseVoiceCategoryOptions = {
  enabled: boolean;
  onCategory: (category: NewsCategory) => void;
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

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function matchCategoryFromText(raw: string): NewsCategory | null {
  const t = stripAccents(raw.toLowerCase());

  if (/\b(saude|hospital|vacina|dengue|posto|ubs)\b/.test(t)) return "saude";
  if (/\b(obras|obra|paviment|drenagem|via|infra)\b/.test(t)) return "obras";
  if (/\b(educacao|escola|matricula|creche|ensino|aluno)\b/.test(t))
    return "educacao";
  return null;
}

function createRecognition(): SpeechRecLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecLike;
    webkitSpeechRecognition?: new () => SpeechRecLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function useVoiceCategory({
  enabled,
  onCategory,
}: UseVoiceCategoryOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [lastHeard, setLastHeard] = useState<string>("");
  const recRef = useRef<SpeechRecLike | null>(null);
  const enabledRef = useRef(enabled);
  const onCategoryRef = useRef(onCategory);
  onCategoryRef.current = onCategory;
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
      setLastHeard(text);
      const cat = matchCategoryFromText(text);
      if (cat) onCategoryRef.current(cat);
    };

    rec.onerror = () => {
      /* permissão / rede — tenta de novo no onend */
    };

    rec.onend = () => {
      if (recRef.current !== rec) return;
      if (!enabledRef.current) return;
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
