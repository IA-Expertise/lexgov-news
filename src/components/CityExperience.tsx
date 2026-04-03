"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Radio } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { TenantConfig } from "@/config/tenants";
import { LEXGOV_BRAND_BLUE } from "@/config/tenants";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from "@/lib/categories";
import type { NewsCategory } from "@/mocks/news";
import { getNewsByTenantAndCategory } from "@/mocks/news";
import { Captions } from "./Captions";
import { Orb, type OrbState } from "./Orb";

type CityExperienceProps = {
  tenant: TenantConfig;
};

export function CityExperience({ tenant }: CityExperienceProps) {
  const [orbHue, setOrbHue] = useState<string>(LEXGOV_BRAND_BLUE);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [reflectionUrl, setReflectionUrl] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState(
    `Olá, sou a LIA. Tenho atualizações oficiais de ${tenant.name}. Sobre o que quer falar agora?`
  );
  const [activeCategory, setActiveCategory] = useState<NewsCategory | null>(
    null
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const handleCategory = (category: NewsCategory) => {
    clearTimer();
    const item = getNewsByTenantAndCategory(tenant.slug, category);
    if (!item) return;

    setActiveCategory(category);
    setOrbHue(CATEGORY_COLORS[category]);
    setReflectionUrl(item.imageUrl);
    setOrbState("talking");
    setCaptionText(item.summary);

    const wordCount = item.summary.trim().split(/\s+/).length;
    const ms = Math.min(45000, Math.max(3500, wordCount * 220));

    timerRef.current = setTimeout(() => {
      setOrbState("idle");
      setCaptionText(
        `Quer ouvir outro tema? Escolha Saúde, Obras ou Educação — ou peça de novo sobre ${CATEGORY_LABELS[category]}.`
      );
      timerRef.current = null;
    }, ms);
  };

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-black text-white">
      <header className="shrink-0 px-6 pt-8 text-center">
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.35em] text-white/70"
        >
          <Radio className="h-3.5 w-3.5 shrink-0 text-white/80" aria-hidden />
          LexGov News
        </motion.p>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-2 font-sans text-lg font-semibold text-white md:text-xl"
        >
          Comunicação Inteligente para o Cidadão
        </motion.h1>
        <p className="mt-1 text-sm text-white/80">{tenant.name}</p>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${tenant.slug}-${orbHue}-${reflectionUrl ?? "none"}`}
            initial={{ opacity: 0.85, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-8"
          >
            <Orb
              state={orbState}
              imageUrl={reflectionUrl}
              categoryColor={orbHue}
            />
            <Captions text={captionText} />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="shrink-0 px-4 pb-10 pt-2">
        <p className="mb-3 text-center text-xs text-white/50">
          Escolha um tema
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {CATEGORY_ORDER.map((cat) => {
            const selected = activeCategory === cat;
            return (
              <motion.button
                key={cat}
                type="button"
                onClick={() => handleCategory(cat)}
                className="rounded-full border border-white/25 bg-white/5 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                style={{
                  boxShadow: selected
                    ? `0 0 20px ${CATEGORY_COLORS[cat]}55`
                    : undefined,
                }}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.02 }}
              >
                {CATEGORY_LABELS[cat]}
              </motion.button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
