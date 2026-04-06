import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/config/tenants";
import { prisma } from "@/lib/prisma";
import { AdminRegenerateButton } from "./AdminRegenerateButton";

export const dynamic = "force-dynamic";

export default async function AdminCityPage({
  params,
}: {
  params: { city: string };
}) {
  const tenant = getTenantBySlug(params.city);
  if (!tenant) notFound();

  if (!process.env.DATABASE_URL) {
    return (
      <p className="text-neutral-400">
        Configure DATABASE_URL para listar notícias ingeridas.
      </p>
    );
  }

  const articles = await prisma.newsArticle.findMany({
    where: { tenantSlug: tenant.slug },
    orderBy: { publishedAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold text-white">
        {tenant.name} — notícias ingeridas
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        Status do TTS (ElevenLabs) por matéria. Regerar consome créditos da API.
      </p>
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[min(100%,720px)] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium text-neutral-300">
                Título
              </th>
              <th scope="col" className="px-3 py-2 font-medium text-neutral-300">
                Categoria
              </th>
              <th scope="col" className="px-3 py-2 font-medium text-neutral-300">
                Áudio
              </th>
              <th scope="col" className="px-3 py-2 font-medium text-neutral-300">
                Ação
              </th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id} className="border-b border-white/5">
                <td className="max-w-[min(100vw,320px)] px-3 py-2 align-top text-neutral-200">
                  {a.title}
                </td>
                <td className="px-3 py-2 text-neutral-400">{a.category}</td>
                <td className="px-3 py-2">
                  {a.audioUrl?.trim() ? (
                    <span className="text-emerald-400">Gerado</span>
                  ) : (
                    <span className="text-amber-400">Pendente</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <AdminRegenerateButton articleId={a.id} citySlug={tenant.slug} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {articles.length === 0 ? (
        <p className="mt-4 text-neutral-500">Nenhuma matéria no banco.</p>
      ) : null}
    </div>
  );
}
