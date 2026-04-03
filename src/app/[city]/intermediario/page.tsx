import Link from "next/link";
import type { Metadata } from "next";
import { IntermediaryDemo } from "@/components/IntermediaryDemo";
import { getTenantBySlug, tenantSlugs } from "@/config/tenants";

type Props = { params: { city: string } };

export function generateMetadata({ params }: Props): Metadata {
  const tenant = getTenantBySlug(params.city);
  if (!tenant) return { title: "Intermediário | LexGov News" };
  return {
    title: `Intermediário (demo) — ${tenant.name} | LexGov News`,
    description:
      "Chat de demonstração com intermediário Gemini para consultar notícias.",
  };
}

export default function IntermediarioPage({ params }: Props) {
  const tenant = getTenantBySlug(params.city);

  if (!tenant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/50">
          LexGov News
        </p>
        <h1 className="mt-4 text-2xl font-semibold">Cidade não encontrada</h1>
        <ul className="mt-8 flex flex-wrap justify-center gap-3">
          {tenantSlugs.map((slug) => (
            <li key={slug}>
              <Link
                href={`/${slug}/intermediario`}
                className="rounded-full border border-white/30 px-5 py-2 text-sm text-white hover:bg-white/10"
              >
                {slug}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return <IntermediaryDemo tenant={tenant} />;
}
