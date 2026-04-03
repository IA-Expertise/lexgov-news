"use client";

import Link from "next/link";
import { useCallback, useState, type CSSProperties } from "react";
import { sendIntermediaryMessage } from "@/app/actions/intermediary";
import type { IntermediaryTurn } from "@/lib/agentIntermediary";
import type { TenantConfig } from "@/config/tenants";

type Msg = { role: "user" | "model"; text: string };

export function IntermediaryDemo({ tenant }: { tenant: TenantConfig }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [lastTrace, setLastTrace] = useState<
    { name: string; args: Record<string, unknown> }[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || pending) return;

    setError(null);
    setLastTrace(null);
    setInput("");
    setPending(true);

    const nextThread: Msg[] = [...messages, { role: "user", text }];
    setMessages(nextThread);

    const history: IntermediaryTurn[] = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    const res = await sendIntermediaryMessage(tenant.slug, text, history);

    setPending(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setMessages((prev) => [...prev, { role: "model", text: res.reply }]);
    if (res.toolTrace?.length) setLastTrace(res.toolTrace);
  }, [input, messages, pending, tenant.slug]);

  return (
    <div
      className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100"
      style={
        {
          "--tenant": tenant.primaryColor,
        } as CSSProperties
      }
    >
      <header className="border-b border-white/10 px-4 py-4 sm:px-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/45">
          LexGov · demonstração
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-white sm:text-xl">
            Intermediário Gemini — {tenant.name}
          </h1>
          <Link
            href={`/${tenant.slug}`}
            className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white/80 transition hover:border-[color:var(--tenant)] hover:text-white"
          >
            Voltar ao portal
          </Link>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
          Entenda pedidos em português, busque notícias reais da base e responda
          em texto. O áudio (ElevenLabs) continua na ingestão; aqui é só o
          meio-campo inteligente para demo.
        </p>
      </header>

      <div className="flex flex-1 flex-col px-4 py-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col rounded-2xl border border-white/10 bg-black/40">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {messages.length === 0 && (
              <p className="text-sm text-white/45">
                Experimente: &quot;Quais as últimas notícias sobre esportes?&quot;
                ou &quot;Tem algo sobre saúde?&quot;
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[90%] rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed"
                    : "mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-white/90"
                }
                style={
                  m.role === "user"
                    ? { backgroundColor: `${tenant.primaryColor}33` }
                    : undefined
                }
              >
                {m.text}
              </div>
            ))}
            {pending && (
              <p className="text-xs text-white/40">Pensando…</p>
            )}
            {error && (
              <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {error}
              </p>
            )}
          </div>

          {lastTrace && lastTrace.length > 0 && (
            <details className="border-t border-white/10 px-4 py-3 text-xs text-white/50 sm:px-6">
              <summary className="cursor-pointer select-none text-white/65">
                Ferramentas chamadas (debug)
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-white/55">
                {JSON.stringify(lastTrace, null, 2)}
              </pre>
            </details>
          )}

          <div className="flex gap-2 border-t border-white/10 p-4 sm:p-6">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Escreva sua pergunta…"
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-[color:var(--tenant)] focus:outline-none focus:ring-1 focus:ring-[color:var(--tenant)]"
              disabled={pending}
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={pending || !input.trim()}
              className="shrink-0 rounded-xl px-5 py-3 text-sm font-medium text-white transition enabled:hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: tenant.primaryColor }}
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
