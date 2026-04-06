import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";
import type { NewsItem } from "@/mocks/news";
import { filterNewsByTopic, sortNewsByRecency } from "@/lib/voiceIntent";

/** Saudação conforme horário (fuso padrão Brasil). */
export function getTimeOfDayGreeting(
  at: Date = new Date(),
  timeZone = "America/Sao_Paulo"
): string {
  const hour = parseInt(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      hour: "numeric",
      hour12: false,
    }).format(at),
    10
  );
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

export type BuildGreetingOptions = {
  /** Momento da fala (cliente = horário local; ingestão = horário do servidor). */
  at?: Date;
};

/**
 * Texto da saudação/menu (ingestão → MP3 e fallback TTS no cliente).
 * Alinhado ao fluxo: notícias novas + categorias + pedido de categoria.
 */
export function buildIngestGreetingScript(
  newsItems: NewsItem[],
  tenantName: string,
  options?: BuildGreetingOptions
): string {
  const at = options?.at ?? new Date();
  const period = getTimeOfDayGreeting(at);
  const sorted = sortNewsByRecency(newsItems);
  if (!sorted.length) {
    return `${period}, tudo bem? Sou a LIA. Neste momento ainda não tenho notícias novas em ${tenantName} na minha base. Tente mais tarde.`;
  }

  const present = new Set(sorted.map((n) => n.category));
  const labels: string[] = [];
  for (const c of CATEGORY_ORDER) {
    if (present.has(c)) labels.push(CATEGORY_LABELS[c]);
  }

  const temEsportes = filterNewsByTopic(sorted, "esportes").length > 0;
  if (temEsportes && !labels.some((l) => /esportes?/i.test(l))) {
    labels.push("esportes");
  }

  const culturaHits = filterNewsByTopic(sorted, "cultura").length;
  if (culturaHits && !labels.some((l) => /cultura/i.test(l))) {
    labels.push("cultura");
  }

  const spoken = labels.length ? labels.join(", ") : "diversos temas";

  return `${period}, tudo bem? Sou a LIA de ${tenantName}. Tenho notícias novas sobre ${spoken}. Diga a categoria que você procura.`;
}

/** @deprecated use buildIngestGreetingScript */
export const buildLiaIntroScript = buildIngestGreetingScript;

/** Depois que o usuário fala — antes de pesquisar na base. */
export const LIA_WAIT_ACKNOWLEDGMENT =
  "Aguarde uns segundos enquanto pesquiso na minha base.";

/**
 * Introdução antes de tocar os áudios das notícias.
 */
export function buildLiaFoundIntro(options: {
  /** "últimas" sem tema específico */
  latest?: boolean;
  /** Rótulo do tema (ex.: Obras, esportes) */
  topicLabel?: string;
  count: number;
}): string {
  const n = Math.min(Math.max(options.count, 1), 3);
  if (options.latest) {
    if (n <= 1) return "Localizei a notícia mais recente.";
    return `Localizei as ${n} notícias mais recentes. São elas:`;
  }
  const t = options.topicLabel?.trim() || "este tema";
  if (n <= 1) return `Localizei uma notícia atualizada sobre ${t}.`;
  return `Localizei as ${n} notícias atualizadas sobre ${t}. São elas:`;
}

/** Fecho após listar notícias — microfone desligado até novo acionamento. */
export function buildLiaClosingLine(tenantName: string): string {
  return `Se quiser ouvir outras notícias, é só acionar o microfone. Prefeitura de ${tenantName}, comunicando o cidadão com inteligência.`;
}
