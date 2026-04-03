"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { TenantConfig } from "@/config/tenants";
import { LEXGOV_BRAND_BLUE } from "@/config/tenants";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/categories";
import type { NewsItem, NewsCategory } from "@/mocks/news";
import { getNewsByTenantAndCategory } from "@/mocks/news";
import {
  filterNewsByTopic,
  parseVoiceIntent,
  sortNewsByRecency,
} from "@/lib/voiceIntent";
import { useVoiceUtterance } from "@/hooks/useVoiceCategory";
import { cancelRobotSpeech, speakRobot, speakRobotParts } from "@/lib/robotSpeech";
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

function speechText(item: NewsItem): string {
  const full = `${item.title}. ${item.summary}`;
  const sentences = full.match(/[^.!?]+[.!?]+/g) ?? [full];
  let result = "";
  for (const s of sentences) {
    if ((result + s).length > 300) break;
    result += s + " ";
  }
  return result.trim() || full.slice(0, 300);
}

function pickNewsForCategory(
  tenantSlug: string,
  category: NewsCategory,
  newsItems: NewsItem[]
): NewsItem | undefined {
  return (
    newsItems.find((n) => n.category === category) ??
    getNewsByTenantAndCategory(tenantSlug, category)
  );
}

export function CityExperience({ tenant, newsItems }: CityExperienceProps) {
  const [orbHue, setOrbHue] = useState<string>(LEXGOV_BRAND_BLUE);
  const [playing, setPlaying] = useState(false);
  const [reflectionUrl, setReflectionUrl] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState(
    `Olá, sou a LIA. Atualizações oficiais de ${tenant.name}. Toque em “Ativar microfone” e fale o que precisa.`
  );
  const [micStarted, setMicStarted] = useState(false);
  const lastPickRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      cancelRobotSpeech();
    };
  }, []);

  const endPlayback = useCallback(() => {
    setPlaying(false);
    setCaptionText(
      `Peça as últimas notícias, um tema — por exemplo esportes — ou ${CATEGORY_LABELS.saude}, ${CATEGORY_LABELS.obras} ou ${CATEGORY_LABELS.educacao}.`
    );
  }, []);

  const handleUtterance = useCallback(
    (text: string) => {
      const now = Date.now();
      if (now - lastPickRef.current < 900) return;
      lastPickRef.current = now;

      cancelRobotSpeech();

      const intent = parseVoiceIntent(text);

      if (intent.kind === "unknown") {
        setPlaying(true);
        setCaptionText(
          "Não entendi. Diga, por exemplo: últimas notícias, as três mais recentes, ou notícias sobre esportes."
        );
        speakRobot(
          "Não entendi. Experimente pedir as últimas notícias, ou um tema como esportes.",
          endPlayback
        );
        return;
      }

      if (intent.kind === "category") {
        const item = pickNewsForCategory(
          tenant.slug,
          intent.category,
          newsItems
        );
        if (!item) return;

        setOrbHue(CATEGORY_COLORS[intent.category]);
        setReflectionUrl(item.imageUrl);
        setPlaying(true);
        setCaptionText(item.title);
        speakRobot(speechText(item), endPlayback);
        return;
      }

      if (intent.kind === "latest") {
        const sorted = sortNewsByRecency(newsItems);
        const slice = sorted.slice(0, intent.count);
        if (!slice.length) {
          speakRobot("Não há notícias disponíveis no momento.", endPlayback);
          return;
        }

        setOrbHue(LEXGOV_BRAND_BLUE);
        setReflectionUrl(slice[0].imageUrl);
        setPlaying(true);
        setCaptionText(slice.map((i) => i.title).join(" · "));

        const intro = `Aqui estão as ${slice.length} notícias mais recentes.`;
        const bullets = slice.map(
          (it, i) => `Notícia ${i + 1}. ${it.title}.`
        );
        speakRobotParts([intro, ...bullets], endPlayback);
        return;
      }

      if (intent.kind === "search") {
        const found = filterNewsByTopic(newsItems, intent.query);
        if (!found.length) {
          setPlaying(true);
          setCaptionText(`Nada encontrado sobre “${intent.query}”.`);
          speakRobot(
            `Não encontrei notícias sobre ${intent.query}. Tente outras palavras.`,
            endPlayback
          );
          return;
        }

        const first = found[0];
        const hue =
          CATEGORY_COLORS[first.category as NewsCategory] ?? LEXGOV_BRAND_BLUE;

        setOrbHue(hue);
        setReflectionUrl(first.imageUrl);
        setPlaying(true);
        setCaptionText(first.title);

        if (found.length === 1) {
          speakRobot(speechText(first), endPlayback);
          return;
        }

        const intro = `Encontrei ${found.length} resultados. Segue a primeira.`;
        speakRobotParts([intro, speechText(first)], endPlayback);
      }
    },
    [endPlayback, newsItems, tenant.slug]
  );

  const voiceEnabled = !playing && micStarted;

  const { status: voiceStatus } = useVoiceUtterance({
    enabled: voiceEnabled,
    onUtterance: handleUtterance,
  });

  const listening = voiceStatus === "listening";
  const orbVisualState = orbStateFromVoice(listening, playing);

  const onActivateMic = useCallback(() => {
    setMicStarted(true);
    setCaptionText(
      `Olá. Peça as últimas notícias, fale um tema como esportes, ou diga ${CATEGORY_LABELS.saude}, ${CATEGORY_LABELS.obras} ou ${CATEGORY_LABELS.educacao}.`
    );
  }, []);

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
        {!micStarted ? (
          <div className="pointer-events-auto flex justify-center">
            <button
              type="button"
              onClick={onActivateMic}
              className="rounded-full border border-white/25 bg-white/10 px-6 py-2.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-sm"
            >
              Ativar microfone
            </button>
          </div>
        ) : (
          <p className="pointer-events-none text-center text-[10px] leading-relaxed text-white/42 sm:text-[11px]">
            Voz · Últimas notícias · temas (ex.: esportes) · Saúde, Obras, Educação ·{" "}
            {voiceStatus === "unsupported"
              ? "Use Chrome ou Edge."
              : listening
                ? "Escutando…"
                : playing
                  ? "LIA está falando…"
                  : ""}
          </p>
        )}
      </footer>
    </div>
  );
}
