"use client";

import { useState } from "react";
import { tenantSlugs } from "@/config/tenants";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      credentials: "include",
    });
    setLoading(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Falha ao entrar");
      return;
    }
    const first = tenantSlugs[0] ?? "louveira";
    window.location.href = `/admin/${first}`;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-white/10 bg-neutral-900/50 p-6"
      >
        <h1 className="text-lg font-semibold text-white">Modo Diretor</h1>
        <p className="text-sm text-neutral-400">
          Acesso restrito — listagem de matérias e regeneração de áudio (ElevenLabs).
        </p>
        <label className="block text-sm text-neutral-300">
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-white outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80"
            autoComplete="current-password"
            required
          />
        </label>
        {error ? (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
