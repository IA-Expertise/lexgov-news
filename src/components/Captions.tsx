"use client";

import { motion, AnimatePresence } from "framer-motion";

type CaptionsProps = {
  text: string;
  className?: string;
};

export function Captions({ text, className = "" }: CaptionsProps) {
  const words = text.trim().length ? text.trim().split(/\s+/) : [];
  const short = words.length <= 14;

  return (
    <div
      className={`mx-auto max-w-[min(100%,19rem)] px-3 text-center font-sans text-[12px] font-normal leading-snug tracking-tight text-white/88 sm:max-w-sm sm:text-[13px] sm:leading-relaxed ${className}`}
      role="status"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        <motion.p
          key={text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className={
            short
              ? "flex flex-wrap justify-center gap-x-1 gap-y-0.5"
              : "flex flex-wrap justify-center gap-x-1 gap-y-1"
          }
        >
          {words.map((word, i) => (
            <motion.span
              key={`${text}-${i}-${word}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: short ? i * 0.028 : i * 0.04,
                duration: 0.28,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {word}
            </motion.span>
          ))}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
