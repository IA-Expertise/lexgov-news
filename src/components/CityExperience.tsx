"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { TenantConfig } from "@/config/tenants";
import { LEXGOV_BRAND_BLUE } from "@/config/tenants";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/categories";
import type { NewsItem, NewsCategory } from "@/mocks/news";
import { getNewsByTenantAndCategory } from "@/mocks/news";
import { useVoiceCategory } from "@/hooks/useVoiceCategory";
import { cancelRobotSpeech, speakRobot } from "@/lib/robotSpeech";
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

/** Título + primeira frase do resumo para leitura em voz robotizada */
function speechText(item: NewsItem): string {
  const sentence = item.summary.split(/(?<=[.!?])\s+/)[0]?.trim() ?? item.summary;
  return `${item.title}. ${sentence}`.slice(0, 900);
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
    `Olá, sou a LIA. Atualizações oficiais de ${tenant.name}. Toque em “Ativar microfone” e diga: Saúde, Obras ou Educação.`
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
      `Fale outro tema: ${CATEGORY_LABELS.saude}, ${CATEGORY_LABELS.obras} ou ${CATEGORY_LABELS.educacao}.`
    );
  }, []);

  const handleCategory = useCallback(
    (category: NewsCategory) => {
      const now = Date.now();
      if (now - lastPickRef.current < 900) return;
      lastPickRef.current = now;

      cancelRobotSpeech();

      const item = pickNewsForCategory(tenant.slug, category, newsItems);
      if (!item) return;

      setOrbHue(CATEGORY_COLORS[category]);
      setReflectionUrl(item.imageUrl);
      setPlaying(true);
      setCaptionText(item.title);

      speakRobot(speechText(item), endPlayback);
    },
    [endPlayback, newsItems, tenant.slug]
  );

  const voiceEnabled = !playing && micStarted;

  const { status: voiceStatus } = useVoiceCategory({
    enabled: voiceEnabled,
    onCategory: handleCategory,
  });

  const listening = voiceStatus === "listening";
  const orbVisualState = orbStateFromVoice(listening, playing);

  const onActivateMic = useCallback(() => {
    setMicStarted(true);
    setCaptionText(
      `Olá, sou a LIA. Atualizações oficiais de ${tenant.name}. Diga: Saúde, Obras ou Educação.`
    );
  }, [tenant.name]);

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
            Voz robotizada · Comando por voz ·{" "}
            {voiceStatus === "unsupported"
              ? "Use Chrome ou Edge para falar com a LIA."
              : listening
                ? "Escutando…"
                : playing
                  ? "LIA está falando…"
                  : "Diga: Saúde, Obras ou Educação"}
          </p>
        )}
      </footer>
    </div>
  );
}
