"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateArticleAudioAction } from "@/app/actions/adminRegenerate";

export function AdminRegenerateButton({
  articleId,
  citySlug,
}: {
  articleId: string;
  citySlug: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className="rounded-lg border border-white/20 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 disabled:opacity-50"
        onClick={() => {
          setMsg("");
          startTransition(async () => {
            const r = await regenerateArticleAudioAction(articleId, citySlug);
            if (!r.ok) {
              setMsg(r.error);
              return;
            }
            setMsg("Atualizado");
            router.refresh();
          });
        }}
      >
        {pending ? "Gerando…" : "Regerar áudio"}
      </button>
      {msg ? (
        <span className="text-xs text-neutral-500" aria-live="polite">
          {msg}
        </span>
      ) : null}
    </div>
  );
}
