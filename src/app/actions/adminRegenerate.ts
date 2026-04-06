"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { tenants } from "@/config/tenants";
import { isAdminSessionValid } from "@/lib/adminSession";
import { attachTtsToArticleIfPossible } from "@/lib/ingestElevenlabs";
import { prisma } from "@/lib/prisma";

export type RegenerateAudioResult =
  | { ok: true }
  | { ok: false; error: string };

export async function regenerateArticleAudioAction(
  articleId: string,
  citySlug: string
): Promise<RegenerateAudioResult> {
  const secret = process.env.ADMIN_SECRET?.trim();
  const token = cookies().get("lexgov_admin")?.value;
  if (!isAdminSessionValid(secret, token)) {
    return { ok: false, error: "Não autorizado" };
  }

  const tenant = tenants[citySlug.toLowerCase()];
  if (!tenant) {
    return { ok: false, error: "Cidade inválida" };
  }

  const row = await prisma.newsArticle.findFirst({
    where: { id: articleId, tenantSlug: tenant.slug },
  });
  if (!row) {
    return { ok: false, error: "Matéria não encontrada" };
  }

  try {
    await attachTtsToArticleIfPossible(
      row.id,
      tenant,
      row.title,
      row.summary,
      { force: true }
    );
  } catch (e) {
    console.error("[admin regenerate]", e);
    return { ok: false, error: "Falha ao gerar áudio" };
  }

  revalidatePath(`/admin/${tenant.slug}`);
  return { ok: true };
}
