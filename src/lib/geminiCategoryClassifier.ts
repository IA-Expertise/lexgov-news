import { GoogleGenAI } from "@google/genai";
import type { NewsCategory } from "@/mocks/news";
import {
  getGeminiApiKey,
  getGeminiBaseUrl,
  getGeminiModel,
} from "@/lib/geminiEnv";
import { inferCategoryHeuristic } from "@/lib/rssIngest";

const ALLOWED = new Set<NewsCategory>(["saude", "obras", "educacao"]);

/**
 * Classificação na ingestão: Gemini (opcional) + fallback na heurística local.
 * Ative com `INGEST_USE_GEMINI_CATEGORY=true` ou `useGemini` no body do POST /api/ingest.
 */
export async function classifyNewsCategoryForIngest(
  title: string,
  summary: string,
  options: { useGemini: boolean }
): Promise<NewsCategory> {
  const heuristic = inferCategoryHeuristic(title, summary);
  const apiKey = getGeminiApiKey();
  if (!options.useGemini || !apiKey) return heuristic;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        apiVersion: "",
        baseUrl: getGeminiBaseUrl() || undefined,
      },
    });

    const prompt = `Classifique a notícia municipal em exatamente UMA categoria.
Responda só com JSON válido (sem markdown): {"category":"saude"|"obras"|"educacao"}
- saude: saúde pública, hospitais, UBS, vacina, dengue, posto de saúde
- obras: pavimentação, drenagem, vias, infraestrutura, construção civil municipal
- educacao: escolas, educação infantil, matrícula, creche, ensino, alunos

Título: ${JSON.stringify(title.slice(0, 500))}
Resumo: ${JSON.stringify(summary.slice(0, 2000))}`;

    const response = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = response.text?.trim() ?? "";
    const parsed = parseCategoryJson(text);
    if (parsed && ALLOWED.has(parsed)) return parsed;
  } catch (e) {
    console.error("[ingest gemini category]", e);
  }

  return heuristic;
}

function parseCategoryJson(text: string): NewsCategory | null {
  const block = text.match(/\{[\s\S]*?\}/);
  if (!block) return null;
  try {
    const o = JSON.parse(block[0]) as { category?: string };
    const c = String(o.category ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (c === "saude") return "saude";
    if (c === "obras") return "obras";
    if (c === "educacao") return "educacao";
  } catch {
    /* ignore */
  }
  return null;
}
