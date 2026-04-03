import type { NewsCategory, NewsItem } from "@/mocks/news";

export type VoiceIntent =
  | { kind: "category"; category: NewsCategory }
  | { kind: "latest"; count: number }
  | { kind: "search"; query: string }
  | { kind: "unknown" };

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Palavras-chave → categorias fixas (legado) */
export function matchCategoryFromText(raw: string): NewsCategory | null {
  const t = stripAccents(raw.toLowerCase());

  if (/\b(saude|hospital|vacina|dengue|posto|ubs)\b/.test(t)) return "saude";
  if (/\b(obras|obra|paviment|drenagem|via|infra)\b/.test(t)) return "obras";
  if (/\b(educacao|escola|matricula|creche|ensino|aluno)\b/.test(t))
    return "educacao";
  return null;
}

/** Temas que não são categoria do portal mas existem como busca (esportes, cultura) */
function matchFreeTopicFromText(raw: string): string | null {
  const t = stripAccents(raw.toLowerCase());
  if (/\b(esportes?|futebol|futsal|volei|vôlei|atletas?|campeonato)\b/.test(t))
    return "esportes";
  if (/\b(cultura|cultural|teatro|cinema|musica|música)\b/.test(t))
    return "cultura";
  return null;
}

const NUMBER_WORDS: Record<string, number> = {
  uma: 1,
  um: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  três: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
};

function parseCountFromText(t: string): number | null {
  const digit = t.match(/\b([1-9]|10)\b/);
  if (digit) return parseInt(digit[1], 10);
  for (const [word, n] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(t)) return n;
  }
  return null;
}

const SPORTS_TERMS = [
  "esporte",
  "futsal",
  "futebol",
  "volei",
  "vôlei",
  "judô",
  "judo",
  "campeonato",
  "atleta",
  "golfe",
  "serie",
  "ouro",
  "veterano",
  "torneio",
  "voleibol",
];

/** Palavras ignoradas na busca por voz (evita exigir "notícias" no título) */
const SEARCH_STOPWORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "a",
  "o",
  "as",
  "os",
  "um",
  "uma",
  "uns",
  "umas",
  "no",
  "na",
  "nos",
  "nas",
  "ao",
  "aos",
  "à",
  "às",
  "com",
  "sem",
  "por",
  "para",
  "pra",
  "sobre",
  "que",
  "tem",
  "quero",
  "ver",
  "me",
  "mais",
  "como",
  "noticia",
  "noticias",
  "notícia",
  "notícias",
  "ultima",
  "ultimas",
  "última",
  "últimas",
  "alguma",
  "algumas",
]);

/** Tema → termos para busca ampla (OR) no título/resumo */
const TOPIC_SYNONYMS: Record<string, string[]> = {
  esporte: SPORTS_TERMS,
  esportes: SPORTS_TERMS,
  futebol: SPORTS_TERMS,
  cultura: ["cultural", "oficina", "teatro", "música", "musica", "cinema"],
  saude: ["saúde", "saude", "vacina", "hospital", "gripe", "desinsetiz", "zoonose", "posto", "ubs"],
  educacao: ["educação", "educacao", "escola", "aluno", "emeb", "pedagóg", "avalia", "creche"],
  educação: ["educação", "educacao", "escola", "aluno", "emeb", "pedagóg", "avalia", "creche"],
  obras: ["obra", "paviment", "drenagem", "infra"],
  obra: ["obra", "paviment", "drenagem", "infra"],
};

/**
 * Interpreta o que o usuário falou.
 * Prioridade: busca ("sobre …") → últimas N → palavra-tema conhecida → categoria fixa.
 */
export function parseVoiceIntent(raw: string): VoiceIntent {
  const t = stripAccents(raw.toLowerCase().trim());
  if (!t) return { kind: "unknown" };

  const searchAfterSobre =
    t.match(/\bsobre\s+([^.,!?]+)/)?.[1]?.trim() ??
    t.match(/\bnoticias?\s+(?:de|sobre)\s+([^.,!?]+)/)?.[1]?.trim();

  if (searchAfterSobre && searchAfterSobre.length >= 2) {
    return { kind: "search", query: searchAfterSobre };
  }

  const latestCue =
    /\b(ultimas?|recentes?|novidades?|mais novas?)\b/.test(t) ||
    /\bnoticias?\s+(mais\s+)?recentes?\b/.test(t) ||
    /\bquais\s+(as\s+)?(ultimas?|noticias?)\b/.test(t);

  if (latestCue) {
    const n = parseCountFromText(t) ?? 3;
    return { kind: "latest", count: Math.min(10, Math.max(1, n)) };
  }

  const oneWord = t.replace(/[.,!?]+$/g, "").trim();
  if (/^(esportes?|futebol|cultura|saude|saúde|educacao|educação|obras)$/.test(oneWord)) {
    const q =
      oneWord === "saúde" || oneWord === "saude"
        ? "saude"
        : oneWord === "educação" || oneWord === "educacao"
          ? "educacao"
          : oneWord;
    if (q === "esportes" || q === "futebol") return { kind: "search", query: "esportes" };
    if (q === "cultura") return { kind: "search", query: "cultura" };
    if (q === "saude" || q === "educacao" || q === "obras") {
      return { kind: "category", category: q as NewsCategory };
    }
    return { kind: "search", query: q };
  }

  const freeTopic = matchFreeTopicFromText(t);
  if (freeTopic) return { kind: "search", query: freeTopic };

  const cat = matchCategoryFromText(t);
  if (cat) return { kind: "category", category: cat };

  if (t.length >= 3 && !/^(oi|ola|hey|ok)$/.test(t)) {
    return { kind: "search", query: raw.trim() };
  }

  return { kind: "unknown" };
}

export function sortNewsByRecency(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });
}

function queryKeywords(qRaw: string): string[] {
  return stripAccents(qRaw.toLowerCase())
    .split(/\s+/)
    .map((w) => w.replace(/[.,!?]+$/g, ""))
    .filter((w) => w.length > 1 && !SEARCH_STOPWORDS.has(w));
}

export function filterNewsByTopic(items: NewsItem[], query: string): NewsItem[] {
  const qRaw = query.trim();
  if (!qRaw) return [];

  const haystack = (item: NewsItem) =>
    stripAccents(`${item.title} ${item.summary}`.toLowerCase());

  const first = stripAccents(qRaw.toLowerCase().split(/\s+/)[0] ?? "");
  const synonyms = TOPIC_SYNONYMS[first];

  if (synonyms?.length && !qRaw.trim().includes(" ")) {
    return items.filter((item) => {
      const hay = haystack(item);
      return synonyms.some((term) =>
        hay.includes(stripAccents(term.toLowerCase()))
      );
    });
  }

  const words = queryKeywords(qRaw);

  if (!words.length) {
    return items.filter((item) => {
      const hay = haystack(item);
      return hay.includes(stripAccents(qRaw.toLowerCase()));
    });
  }

  /** Com várias palavras, basta qualquer termo relevante bater (mais tolerante à fala). */
  return items.filter((item) => {
    const hay = haystack(item);
    return words.some((w) => hay.includes(w));
  });
}
