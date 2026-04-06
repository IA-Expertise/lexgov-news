"use client";

import { useEffect, useState } from "react";

/** Chrome, Edge e outros Chromium costumam ter melhor suporte a reconhecimento de voz. */
function isRecommendedVoiceBrowser(): boolean {
  if (typeof navigator === "undefined") return true;
  const ua = navigator.userAgent;
  return /Edg\/|Chrome\/|CriOS\//.test(ua);
}

export function VoiceBrowserHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!isRecommendedVoiceBrowser());
  }, []);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none mx-auto max-w-lg px-4 pb-2 text-center text-[11px] leading-snug text-amber-200/95 sm:text-xs"
    >
      Para uma melhor experiência de voz, use{" "}
      <span className="font-medium text-amber-100">Chrome</span> ou{" "}
      <span className="font-medium text-amber-100">Edge</span>.
    </div>
  );
}
