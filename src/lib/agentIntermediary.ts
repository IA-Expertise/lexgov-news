import {
  FunctionCallingMode,
  GoogleGenerativeAI,
  SchemaType,
} from "@google/generative-ai";
import type { Content, FunctionDeclaration, Schema } from "@google/generative-ai";
import { fetchNewsForAgent } from "@/lib/agentNewsData";

export type IntermediaryTurn = { role: "user" | "model"; text: string };

export type IntermediaryResult = {
  reply: string;
  /** Metadados opcionais para demo / debug */
  toolTrace?: { name: string; args: Record<string, unknown> }[];
};

const SYSTEM_PT = `Você é o intermediário LexGov (demonstração): ajuda o usuário com notícias públicas da cidade informada.
Responda sempre em português do Brasil, de forma clara e objetiva.
Quando precisar de dados atualizados de notícias, use a ferramenta listar_noticias.
Se a lista vier vazia, diga que não encontrou resultados para o filtro e sugira outro termo.
Não invente fatos além do que vier da ferramenta.`;

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function defaultModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
}

function turnsToHistory(turns: IntermediaryTurn[]): Content[] {
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
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY não configurada");
  }

  const city = input.city.trim().toLowerCase();
  if (!city) {
    throw new Error("city é obrigatório");
  }

  const genAI = new GoogleGenerativeAI(key);
  const toolTrace: { name: string; args: Record<string, unknown> }[] = [];

  const listarNoticiasDecl: FunctionDeclaration = {
    name: "listar_noticias",
    description:
      "Busca notícias já ingeridas do portal da cidade. Use para responder sobre últimas matérias, temas (ex.: esportes, saúde) ou termos livres.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        cidade: {
          type: SchemaType.STRING,
          description: "Slug da cidade (ex.: louveira, vinhedo).",
        } satisfies Schema,
        q: {
          type: SchemaType.STRING,
          description:
            "Filtro opcional: palavras do tema ou busca (ex.: esporte, vacina, obra). Vazio para listar as mais recentes.",
        } satisfies Schema,
        limit: {
          type: SchemaType.INTEGER,
          description: "Quantidade máxima de notícias (1–25). Padrão 8.",
        } satisfies Schema,
      },
      required: ["cidade"],
    },
  };

  const model = genAI.getGenerativeModel({
    model: defaultModel(),
    systemInstruction: `${SYSTEM_PT}\n\nCidade padrão desta sessão: "${city}". Prefira usar esta cidade em listar_noticias.cidade salvo se o usuário pedir outra explicitamente.`,
    tools: [{ functionDeclarations: [listarNoticiasDecl] }],
    toolConfig: {
      functionCallingConfig: { mode: FunctionCallingMode.AUTO },
    },
  });

  const prior = input.history?.length
    ? turnsToHistory(input.history)
    : [];

  const chat = model.startChat({
    history: prior,
  });

  let result = await chat.sendMessage(input.message.trim());
  const maxToolRounds = 5;

  for (let round = 0; round < maxToolRounds; round++) {
    const calls = result.response.functionCalls();
    if (!calls?.length) break;

    const responseParts: {
      functionResponse: { name: string; response: Record<string, unknown> };
    }[] = [];

    for (const call of calls) {
      toolTrace.push({
        name: call.name,
        args: call.args as Record<string, unknown>,
      });

      if (call.name === "listar_noticias") {
        const args = call.args as {
          cidade?: string;
          q?: string;
          limit?: number;
        };
        const c = (args.cidade || city).trim().toLowerCase();
        const q = typeof args.q === "string" ? args.q : "";
        const limit =
          typeof args.limit === "number" && Number.isFinite(args.limit)
            ? args.limit
            : 8;
        const data = await fetchNewsForAgent(c, { q, limit });
        responseParts.push({
          functionResponse: {
            name: call.name,
            response: { ok: true, ...data },
          },
        });
      } else {
        responseParts.push({
          functionResponse: {
            name: call.name,
            response: { ok: false, error: "função_desconhecida" },
          },
        });
      }
    }

    result = await chat.sendMessage(responseParts);
  }

  const text = result.response.text();
  return {
    reply: text.trim() || "Não consegui gerar uma resposta. Tente de novo.",
    toolTrace: toolTrace.length ? toolTrace : undefined,
  };
}
