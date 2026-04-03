"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { TenantConfig } from "@/config/tenants";
import { LEXGOV_BRAND_BLUE } from "@/config/tenants";
import { CATEGORY_COLORS } from "@/lib/categories";
import type { NewsItem, NewsCategory } from "@/mocks/news";
import {
  filterNewsByTopic,
  parseVoiceIntent,
  sortNewsByRecency,
} from "@/lib/voiceIntent";
import { buildLiaIntroScript, LIA_WAIT_ACKNOWLEDGMENT } from "@/lib/liaIntro";
import { useVoiceUtterance } from "@/hooks/useVoiceCategory";
import { useNewsPlayback } from "@/hooks/useNewsPlayback";
import { cancelRobotSpeech } from "@/lib/robotSpeech";
import { Captions } from "./Captions";
import { Orb, type OrbState } from "./Orb";

type CityExperienceProps = {
  tenant: TenantConfig;
  newsItems: NewsItem[];
};

function orbStateFromVoice(
  voiceListening: boolean,
  talking: boolean
): OrbState {
  if (talking) return "talking";
  if (voiceListening) return "listening";
  return "idle";
}

export function CityExperience({ tenant, newsItems }: CityExperienceProps) {
  const [orbHue, setOrbHue] = useState<string>(LEXGOV_BRAND_BLUE);
  const [playing, setPlaying] = useState(false);
  const [reflectionUrl, setReflectionUrl] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState(
    `Olá, sou a LIA. Atualizações oficiais de ${tenant.name}. Toque em "Falar com a LIA" para ouvir o que tenho e escolher um tema.`
  );
  /** Só enquanto true o reconhecimento fica ativo — um toque = uma pergunta (sem microfone sempre ligado). */
  const [sessionArmed, setSessionArmed] = useState(false);
  const lastPickRef = useRef<number>(0);
  /** Evita processar o mesmo comando de voz duas vezes (Chrome costuma disparar onresult repetido). */
  const lastUtteranceRef = useRef<{ text: string; at: number }>({
    text: "",
    at: 0,
  });
  const { playOne, playSequential, speak, cancelPlayback } =
    useNewsPlayback(tenant.slug);

  useEffect(() => {
    return () => {
      cancelRobotSpeech();
    };
  }, []);

  const endPlayback = useCallback(() => {
    setPlaying(false);
    setCaptionText(
      'Toque em "Falar com a LIA" quando quiser fazer outra pergunta.'
    );
  }, []);

  const processCommand = useCallback(
    (text: string) => {
      const now = Date.now();
      if (now - lastPickRef.current < 900) return;
      lastPickRef.current = now;

      cancelPlayback();

      const intent = parseVoiceIntent(text);

      if (intent.kind === "unknown") {
        setPlaying(true);
        setCaptionText(
          "Não entendi. Diga um tema: saúde, obras, educação, esportes, ou “últimas notícias”."
        );
        speak(
          "Não entendi. Experimente dizer saúde, obras, educação, esportes, ou últimas notícias.",
          endPlayback
        );
        return;
      }

      if (intent.kind === "category") {
        const sorted = sortNewsByRecency(
          newsItems.filter((n) => n.category === intent.category)
        );
        const slice = sorted.slice(0, 3);
        if (!slice.length) {
          setPlaying(true);
          speak(
            `Não há notícias de ${intent.category} na base neste momento.`,
            endPlayback
          );
          return;
        }

        const first = slice[0];
        setOrbHue(CATEGORY_COLORS[intent.category]);
        setReflectionUrl(first.imageUrl);
        setPlaying(true);
        setCaptionText(slice.map((i) => i.title).join(" · "));
        playSequential(slice, endPlayback);
        return;
      }

      if (intent.kind === "latest") {
        const sorted = sortNewsByRecency(newsItems);
        const count = Math.min(intent.count, 3);
        const slice = sorted.slice(0, count);
        if (!slice.length) {
          setPlaying(true);
          speak("Não há notícias disponíveis no momento.", endPlayback);
          return;
        }

        setOrbHue(LEXGOV_BRAND_BLUE);
        setReflectionUrl(slice[0].imageUrl);
        setPlaying(true);
        setCaptionText(slice.map((i) => i.title).join(" · "));
        playSequential(slice, endPlayback);
        return;
      }

      if (intent.kind === "search") {
        const found = filterNewsByTopic(newsItems, intent.query);
        if (!found.length) {
          setPlaying(true);
          setCaptionText(`Nada encontrado sobre “${intent.query}”.`);
          speak(
            `Não encontrei notícias sobre ${intent.query} na base atual. Tente outro tema ou diga saúde, obras ou educação.`,
            endPlayback
          );
          return;
        }

        const slice = found.slice(0, 3);
        const first = slice[0];
        const hue =
          CATEGORY_COLORS[first.category as NewsCategory] ?? LEXGOV_BRAND_BLUE;

        setOrbHue(hue);
        setReflectionUrl(first.imageUrl);
        setPlaying(true);
        setCaptionText(slice.map((i) => i.title).join(" · "));

        if (slice.length === 1) {
          playOne(first, endPlayback);
          return;
        }

        const intro =
          found.length > slice.length
            ? `Encontrei ${found.length} resultados. Seguem as ${slice.length} primeiras.`
            : `Encontrei ${found.length} notícias.`;

        speak(intro, () => playSequential(slice, endPlayback));
      }
    },
    [cancelPlayback, endPlayback, newsItems, playOne, playSequential, speak]
  );

  const handleUtterance = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const t = Date.now();
      if (
        trimmed === lastUtteranceRef.current.text &&
        t - lastUtteranceRef.current.at < 2800
      ) {
        return;
      }
      lastUtteranceRef.current = { text: trimmed, at: t };

      setSessionArmed(false);
      cancelPlayback();
      setPlaying(true);
      setCaptionText(LIA_WAIT_ACKNOWLEDGMENT);
      speak(LIA_WAIT_ACKNOWLEDGMENT, () => {
        processCommand(trimmed);
      });
    },
    [cancelPlayback, processCommand, speak]
  );

  const handleListeningEnd = useCallback(
    (reason: "silence" | "error") => {
      setSessionArmed(false);
      if (reason === "silence") {
        setCaptionText(
          "Não ouvi bem. Toque de novo em \"Falar com a LIA\" e fale perto do microfone."
        );
      } else {
        setCaptionText(
          "Erro no microfone. Verifique a permissão ou tente Chrome / Edge."
        );
      }
    },
    []
  );

  // Microfone só enquanto o usuário manteve a sessão armada e a LIA não está falando.
  const voiceEnabled = sessionArmed && !playing;

  const { status: voiceStatus, stop: stopListening } = useVoiceUtterance({
    enabled: voiceEnabled,
    oneShot: true,
    onUtterance: handleUtterance,
    onListeningEnd: handleListeningEnd,
  });

  const listening = voiceStatus === "listening";
  const orbVisualState = orbStateFromVoice(listening, playing);

  const onArmSession = useCallback(() => {
    cancelPlayback();
    setSessionArmed(true);
    setPlaying(true);
    setCaptionText("Um momento…");
    speak(buildLiaIntroScript(newsItems, tenant.name), () => {
      setPlaying(false);
      setCaptionText(
        "Diga o tema: saúde, obras, educação, esportes, cultura, ou “últimas notícias”."
      );
    });
  }, [cancelPlayback, newsItems, speak, tenant.name]);

  const onCancelListening = useCallback(() => {
    cancelPlayback();
    stopListening();
    setSessionArmed(false);
    setPlaying(false);
    setCaptionText(
      'Toque em "Falar com a LIA" quando quiser perguntar de novo.'
    );
  }, [cancelPlayback, stopListening]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-black text-white selection:bg-white/20">
      <header className="pointer-events-none shrink-0 px-4 pb-1 pt-[max(1.75rem,env(safe-area-inset-top))] text-center">
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.38em] text-white sm:text-[11px]"
        >
          <Mic className="h-3 w-3 shrink-0 text-white/85" aria-hidden />
          LexGov News
        </motion.p>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.06 }}
          className="mx-auto mt-2 max-w-[18rem] font-sans text-[0.95rem] font-bold leading-tight tracking-tight text-white sm:max-w-md sm:text-lg"
        >
          Comunicação Inteligente para o Cidadão
        </motion.h1>
        <p className="mt-1.5 text-[12px] font-normal text-neutral-500 sm:text-sm">
          {tenant.name}
        </p>
      </header>

      <main className="pointer-events-none flex min-h-0 flex-1 flex-col items-center justify-center px-3 py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${tenant.slug}-${orbHue}-${reflectionUrl ?? "none"}`}
            initial={{ opacity: 0.9, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-full max-w-lg flex-col items-center gap-4 sm:gap-5"
          >
            <Orb
              state={orbVisualState}
              imageUrl={reflectionUrl}
              categoryColor={orbHue}
            />
            <Captions text={captionText} />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-0">
        <div className="pointer-events-auto flex flex-col items-center gap-3">
          {!sessionArmed && !playing && (
            <button
              type="button"
              onClick={onArmSession}
              className="rounded-full border border-white/25 bg-white/10 px-6 py-2.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-sm"
            >
              Falar com a LIA
            </button>
          )}
          {sessionArmed && listening && (
            <button
              type="button"
              onClick={onCancelListening}
              className="text-[11px] text-white/50 underline-offset-2 hover:text-white/75 hover:underline sm:text-xs"
            >
              Cancelar escuta
            </button>
          )}
          <p className="pointer-events-none text-center text-[10px] leading-relaxed text-white/42 sm:text-[11px]">
            {voiceStatus === "unsupported"
              ? "Reconhecimento de voz não disponível. Use Chrome ou Edge."
              : playing
                ? "LIA está falando…"
                : listening
                  ? "Ouvindo sua pergunta…"
                  : null}
          </p>
        </div>
      </footer>
    </div>
  );
}
