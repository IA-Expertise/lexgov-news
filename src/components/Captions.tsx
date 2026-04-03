"use client";

import { motion, AnimatePresence } from "framer-motion";

type CaptionsProps = {
  text: string;
  className?: string;
};

export function Captions({ text, className = "" }: CaptionsProps) {
  const words = text.trim().length ? text.trim().split(/\s+/) : [];

  return (
    <div
      className={`mx-auto max-w-xl px-4 text-center font-sans text-base font-normal leading-relaxed text-white md:text-lg ${className}`}
      role="status"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        <motion.p
          key={text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-wrap justify-center gap-x-1 gap-y-1"
        >
          {words.map((word, i) => (
            <motion.span
              key={`${text}-${i}-${word}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: i * 0.045,
                duration: 0.35,
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
