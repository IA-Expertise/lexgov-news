"use client";

import { motion } from "framer-motion";

export type OrbState = "idle" | "talking";

type OrbProps = {
  state: OrbState;
  imageUrl?: string | null;
  categoryColor: string;
};

export function Orb({ state, imageUrl, categoryColor }: OrbProps) {
  const isTalking = state === "talking";

  return (
    <div
      className="flex items-center justify-center rounded-full bg-black p-0"
      style={{ width: 320, height: 320 }}
    >
      <motion.div
        className="relative h-full w-full overflow-hidden rounded-full"
        animate={{
          scale: isTalking ? [1, 1.08, 1] : [1, 1.02, 1],
          boxShadow: isTalking
            ? [
                `0 0 40px 8px ${categoryColor}66`,
                `0 0 56px 16px ${categoryColor}AA`,
                `0 0 40px 8px ${categoryColor}66`,
              ]
            : `0 0 32px 5px ${categoryColor}44`,
        }}
        transition={{
          duration: isTalking ? 0.55 : 3.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Camada de cor base + volume (gradiente radial — luz topo-esquerda) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              radial-gradient(circle at 28% 22%, rgba(255,255,255,0.42) 0%, transparent 42%),
              radial-gradient(circle at 50% 100%, rgba(0,0,0,0.35) 0%, transparent 55%),
              radial-gradient(circle at 70% 30%, rgba(255,255,255,0.08) 0%, transparent 40%),
              linear-gradient(145deg, ${categoryColor} 0%, ${adjustBrightness(categoryColor, -28)} 100%)
            `,
          }}
        />

        {/* Reflexo interno da notícia */}
        {imageUrl ? (
          <div
            className="absolute inset-0 rounded-full mix-blend-overlay opacity-60"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(3px)",
            }}
            aria-hidden
          />
        ) : null}

        {/* Vidro / brilho esférico */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: `
              radial-gradient(circle at 32% 24%, rgba(255,255,255,0.5) 0%, transparent 38%),
              radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.25) 100%)
            `,
          }}
        />
      </motion.div>
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
