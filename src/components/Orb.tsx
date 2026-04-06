"use client";

import { motion } from "framer-motion";

export type OrbState = "idle" | "listening" | "talking";

type OrbProps = {
  state: OrbState;
  imageUrl?: string | null;
  categoryColor: string;
  /** Rótulo para leitores de tela (estado da LIA). */
  "aria-label"?: string;
};

export function Orb({
  state,
  imageUrl,
  categoryColor,
  "aria-label": ariaLabel,
}: OrbProps) {
  const isTalking = state === "talking";
  const isListening = state === "listening";
  const pulse = isTalking || isListening;

  const glowSoft = hexToRgba(categoryColor, 0.38);
  const glowMid = hexToRgba(categoryColor, 0.55);
  const glowIdle = hexToRgba(categoryColor, 0.32);
  const ambient = hexToRgba(categoryColor, 0.22);

  return (
    <div
      className="relative flex w-full max-w-[min(92vw,320px)] flex-col items-center justify-center"
      role="img"
      aria-label={
        ariaLabel ??
        (isTalking
          ? "Assistente LIA falando"
          : isListening
            ? "Assistente LIA ouvindo"
            : "Assistente LIA em repouso")
      }
    >
      {/* Luz difusa no fundo — volume e profundidade */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(88vw,380px)] w-[min(88vw,380px)] -translate-x-1/2 -translate-y-[48%] rounded-full blur-[72px]"
        style={{
          background: `radial-gradient(circle, ${ambient} 0%, transparent 68%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(70vw,260px)] w-[min(70vw,260px)] -translate-x-1/2 -translate-y-[48%] rounded-full blur-[40px] opacity-70"
        style={{
          background: `radial-gradient(circle at 40% 35%, ${hexToRgba(
            categoryColor,
            0.35
          )} 0%, transparent 55%)`,
        }}
        aria-hidden
      />

      <div
        className="relative z-10 mx-auto aspect-square w-[min(68vw,260px)] sm:w-[min(58vw,280px)]"
        style={{
          filter: `drop-shadow(0 12px 36px ${hexToRgba(categoryColor, 0.28)})`,
        }}
      >
        <motion.div
          className="relative h-full w-full overflow-hidden rounded-full"
          style={{
            boxShadow: `
              inset 0 -28px 48px rgba(0,0,0,0.55),
              inset 0 12px 32px rgba(255,255,255,0.12),
              inset 0 0 0 1px rgba(255,255,255,0.08)
            `,
          }}
          animate={{
            scale: pulse
              ? isTalking
                ? [1, 1.06, 1]
                : [1, 1.03, 1]
              : [1, 1.015, 1],
            boxShadow: isTalking
              ? [
                  `inset 0 -28px 48px rgba(0,0,0,0.55), inset 0 12px 32px rgba(255,255,255,0.14), 0 0 52px 14px ${glowSoft}`,
                  `inset 0 -28px 48px rgba(0,0,0,0.5), inset 0 12px 36px rgba(255,255,255,0.18), 0 0 68px 20px ${glowMid}`,
                  `inset 0 -28px 48px rgba(0,0,0,0.55), inset 0 12px 32px rgba(255,255,255,0.14), 0 0 52px 14px ${glowSoft}`,
                ]
              : isListening
                ? [
                    `inset 0 -28px 48px rgba(0,0,0,0.55), inset 0 12px 30px rgba(255,255,255,0.1), 0 0 40px 10px ${glowSoft}`,
                    `inset 0 -28px 48px rgba(0,0,0,0.52), inset 0 12px 34px rgba(255,255,255,0.16), 0 0 52px 16px ${glowMid}`,
                    `inset 0 -28px 48px rgba(0,0,0,0.55), inset 0 12px 30px rgba(255,255,255,0.1), 0 0 40px 10px ${glowSoft}`,
                  ]
                : `inset 0 -28px 48px rgba(0,0,0,0.55), inset 0 12px 28px rgba(255,255,255,0.1), 0 0 44px 12px ${glowIdle}`,
          }}
          transition={{
            duration: isTalking ? 0.5 : isListening ? 1.1 : 3.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Esfera base — gradiente com “equador” mais escuro (volume 3D) */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                radial-gradient(ellipse 120% 80% at 50% 18%, rgba(255,255,255,0.38) 0%, transparent 45%),
                radial-gradient(ellipse 90% 70% at 70% 80%, rgba(0,0,0,0.45) 0%, transparent 50%),
                radial-gradient(circle at 30% 28%, rgba(255,255,255,0.2) 0%, transparent 42%),
                linear-gradient(160deg, ${lighten(categoryColor, 12)} 0%, ${categoryColor} 42%, ${adjustBrightness(categoryColor, -36)} 100%)
              `,
            }}
          />

          {/* Imagem central — mais transparente, integrada ao vidro */}
          {imageUrl ? (
            <div
              className="absolute inset-[8%] rounded-full mix-blend-soft-light opacity-[0.34]"
              style={{
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(6px) saturate(1.08)",
                boxShadow: "inset 0 0 40px rgba(0,0,0,0.35)",
              }}
              aria-hidden
            />
          ) : null}

          {/* Borda interna clara — sensação de espessura */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background: `
                radial-gradient(circle at 50% 0%, rgba(255,255,255,0.22) 0%, transparent 35%),
                radial-gradient(circle at 88% 22%, rgba(255,255,255,0.12) 0%, transparent 28%)
              `,
            }}
          />

          {/* Vidro / reflexo superior */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background: `
                radial-gradient(circle at 34% 22%, rgba(255,255,255,0.55) 0%, transparent 36%),
                radial-gradient(circle at 50% 88%, rgba(0,0,0,0.35) 0%, transparent 42%)
              `,
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

function adjustBrightness(hex: string, amount: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = Math.min(255, Math.max(0, parseInt(m[1], 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(m[2], 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(m[3], 16) + amount));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function lighten(hex: string, pct: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const f = (n: string) =>
    Math.min(255, Math.round(parseInt(n, 16) + (255 - parseInt(n, 16)) * (pct / 100)));
  return `#${[f(m[1]), f(m[2]), f(m[3])]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return `rgba(255, 255, 255, ${alpha})`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
