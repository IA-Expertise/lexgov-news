import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";
import type { NewsItem } from "@/mocks/news";
import { filterNewsByTopic, sortNewsByRecency } from "@/lib/voiceIntent";

/**
 * Texto da abertura da LIA: resume o que há na base (RSS) e convida a escolher um tema.
 */
export function buildLiaIntroScript(
  newsItems: NewsItem[],
  tenantName: string
): string {
  const sorted = sortNewsByRecency(newsItems);
  if (!sorted.length) {
    return `Neste momento não há notícias em ${tenantName} na minha base. Tente mais tarde ou atualize o portal.`;
  }

  const present = new Set(sorted.map((n) => n.category));
  const labels: string[] = [];
  for (const c of CATEGORY_ORDER) {
    if (present.has(c)) labels.push(CATEGORY_LABELS[c]);
  }

  const temEsportes = filterNewsByTopic(sorted, "esportes").length > 0;
  if (temEsportes && !labels.includes("esportes")) {
    labels.push("esportes");
  }

  const culturaHits = filterNewsByTopic(sorted, "cultura").length;
  if (culturaHits && !labels.includes("cultura")) {
    labels.push("cultura");
  }

  const spoken = labels.length
    ? labels.join(", ")
    : "diversos temas";

  return `Neste momento, tenho notícias sobre ${spoken}. Que tipo de notícia você procura? Você pode dizer: saúde, obras, educação, esportes, cultura, ou pedir as últimas notícias.`;
}

/** Reproduzida por voz (ElevenLabs) depois que o usuário fala, antes de pesquisar / gerar áudio. */
export const LIA_WAIT_ACKNOWLEDGMENT =
  "Ok, recebi a sua solicitação. Aguarde alguns segundos enquanto eu pesquiso aqui.";
