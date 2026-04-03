import Link from "next/link";
import type { Metadata } from "next";
import { CityExperience } from "@/components/CityExperience";
import { getTenantBySlug, tenantSlugs } from "@/config/tenants";

type Props = { params: { city: string } };

export function generateMetadata({ params }: Props): Metadata {
  const { city } = params;
  const tenant = getTenantBySlug(city);
  if (!tenant) {
    return { title: "Cidade não encontrada | LexGov News" };
  }
  return {
    title: `${tenant.name} | LexGov News`,
    description:
      "Comunicação Inteligente para o Cidadão — atualizações oficiais com a LIA.",
  };
}

export default function CityPage({ params }: Props) {
  const { city } = params;
  const tenant = getTenantBySlug(city);

  if (!tenant) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/50">
          LexGov News
        </p>
        <h1 className="mt-4 max-w-md font-sans text-2xl font-semibold leading-snug">
          Não encontramos esta cidade
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75">
          O endereço <span className="text-white">/{city}</span> não está
          cadastrado. Verifique o link ou escolha uma cidade disponível.
        </p>
        <ul className="mt-8 flex flex-wrap justify-center gap-3">
          {tenantSlugs.map((slug) => (
            <li key={slug}>
              <Link
                href={`/${slug}`}
                className="rounded-full border border-white/30 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                {slug}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/"
          className="mt-10 text-sm text-white/60 underline-offset-4 hover:text-white hover:underline"
        >
          Voltar ao início
        </Link>
      </div>
    );
  }

  return <CityExperience tenant={tenant} />;
}
