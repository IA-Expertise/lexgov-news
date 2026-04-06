import {
  FunctionCallingConfigMode,
  GoogleGenAI,
} from "@google/genai";
import type { Content, ToolListUnion } from "@google/genai";
import { fetchNewsForAgent } from "@/lib/agentNewsData";
import {
  getGeminiApiKey,
  getGeminiBaseUrl,
  getGeminiModel,
} from "@/lib/geminiEnv";

export type IntermediaryTurn = { role: "user" | "model"; text: string };

export type IntermediaryResult = {
  reply: string;
  toolTrace?: { name: string; args: Record<string, unknown> }[];
};

const SYSTEM_PT = `Você é o intermediário LexGov (demonstração): ajuda o usuário com notícias públicas da cidade informada.
Responda sempre em português do Brasil, de forma clara e objetiva.
Quando precisar de dados atualizados de notícias, use a ferramenta listar_noticias.
Se a lista vier vazia, diga que não encontrou resultados para o filtro e sugira outro termo.
Não invente fatos além do que vier da ferramenta.`;

export { isGeminiConfigured } from "@/lib/geminiEnv";

function defaultModel(): string {
  return getGeminiModel();
}

function turnsToContents(turns: IntermediaryTurn[]): Content[] {
  return turns.map((t) => ({
    role: t.role,
    parts: [{ text: t.text }],
  }));
}

export async function runIntermediaryChat(input: {
  city: string;
  message: string;
  history?: IntermediaryTurn[];
}): Promise<IntermediaryResult> {
  const apiKey = getGeminiApiKey();
  const baseUrl = getGeminiBaseUrl();

  if (!apiKey) {
    throw new Error("Integração Gemini não configurada");
  }

  const city = input.city.trim().toLowerCase();
  if (!city) {
    throw new Error("city é obrigatório");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      apiVersion: "",
      baseUrl: baseUrl || undefined,
    },
  });

  const toolTrace: { name: string; args: Record<string, unknown> }[] = [];

  const tools = [
    {
      functionDeclarations: [
        {
          name: "listar_noticias",
          description:
            "Busca notícias já ingeridas do portal da cidade. Use para responder sobre últimas matérias, temas (ex.: esportes, saúde) ou termos livres.",
          parameters: {
            type: "object",
            properties: {
              cidade: {
                type: "string",
                description: "Slug da cidade (ex.: louveira, vinhedo).",
              },
              q: {
                type: "string",
                description:
                  "Filtro opcional: palavras do tema ou busca (ex.: esporte, vacina, obra). Vazio para listar as mais recentes.",
              },
              limit: {
                type: "integer",
                description: "Quantidade máxima de notícias (1–25). Padrão 8.",
              },
            },
            required: ["cidade"],
          },
        },
      ],
    },
  ] as unknown as ToolListUnion;

  const systemInstruction = `${SYSTEM_PT}\n\nCidade padrão desta sessão: "${city}". Prefira usar esta cidade em listar_noticias.cidade salvo se o usuário pedir outra explicitamente.`;

  const prior = input.history?.length ? turnsToContents(input.history) : [];
  let contents: Content[] = [
    ...prior,
    { role: "user", parts: [{ text: input.message.trim() }] },
  ];

  const maxToolRounds = 5;

  for (let round = 0; round <= maxToolRounds; round++) {
    const response = await ai.models.generateContent({
      model: defaultModel(),
      contents,
      config: {
        systemInstruction,
        tools,
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    const fnCalls = parts.filter((p) => p.functionCall);

    if (!fnCalls.length) {
      const text = response.text || "";
      return {
        reply: text.trim() || "Não consegui gerar uma resposta. Tente de novo.",
        toolTrace: toolTrace.length ? toolTrace : undefined,
      };
    }

    contents = [...contents, { role: "model", parts }];

    const fnResponseParts: Content["parts"] = [];

    for (const part of fnCalls) {
      const call = part.functionCall!;
      const args = (call.args || {}) as Record<string, unknown>;
      toolTrace.push({ name: call.name!, args });

      if (call.name === "listar_noticias") {
        const c = ((args.cidade as string) || city).trim().toLowerCase();
        const q = typeof args.q === "string" ? args.q : "";
        const limit =
          typeof args.limit === "number" && Number.isFinite(args.limit)
            ? (args.limit as number)
            : 8;
        const data = await fetchNewsForAgent(c, { q, limit });
        fnResponseParts.push({
          functionResponse: {
            name: call.name,
            response: { ok: true, ...data },
          },
        });
      } else {
        fnResponseParts.push({
          functionResponse: {
            name: call.name!,
            response: { ok: false, error: "função_desconhecida" },
          },
        });
      }
    }

    contents = [...contents, { role: "user", parts: fnResponseParts }];
  }

  return {
    reply: "Não consegui gerar uma resposta. Tente de novo.",
    toolTrace: toolTrace.length ? toolTrace : undefined,
  };
}
