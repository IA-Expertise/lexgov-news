# LexGov News — Documento técnico para análise comercial (Gemini / stakeholders)

**Versão do produto:** 0.2.0  
**Tipo:** aplicação web **multi-tenant** para comunicação pública municipal com **assistente de voz (LIA)**, **ingestão de notícias via RSS**, **TTS (ElevenLabs)** e interface imersiva (**orbe 3D** + legendas).

Este documento descreve **o que o sistema faz**, **como está arquitetado**, **quais integrações consome**, **limitações atuais** e **ângulos comerciais** (produto white-label, custos variáveis, governança de dados).

---

## 1. Proposta de valor

| Público | Benefício |
|--------|-----------|
| **Prefeitura / comunicação** | Canal único e moderno para divulgar matérias oficiais já publicadas no portal, com voz natural e experiência guiada por comando de voz. |
| **Cidadão** | Ouvir notícias por tema (saúde, obras, educação, etc.), “últimas notícias” ou busca por palavra-chave, sem navegar menus complexos. |
| **LexGov / parceiro** | Base **multi-cidade** (tenant por slug na URL), branding LexGov, extensível para novos municípios com RSS + voz configuráveis. |

**Diferenciais técnicos observáveis no código:**

- **Pré-geração de áudio na ingestão** (MP3 por artigo + áudio de saudação/menu por cidade), reduzindo latência na hora de ouvir.
- **Duas experiências de “agente”:** (A) fluxo **offline-first** por **reconhecimento de voz no navegador** + regras (`parseVoiceIntent`); (B) **demonstração** de **chat com Gemini** chamando ferramenta de listagem de notícias (`/api/agent/intermediary`).

---

## 2. Stack tecnológico

| Camada | Tecnologia |
|--------|------------|
| Framework | **Next.js 14** (App Router), **React 18** |
| Linguagem | **TypeScript** |
| Estilo / UI | **Tailwind CSS**, **Framer Motion**, **lucide-react** |
| Banco de dados | **PostgreSQL** via **Prisma ORM** |
| Ingestão RSS | **rss-parser** |
| TTS | **ElevenLabs** (HTTP; modelo configurável, p.ex. `eleven_flash_v2_5`) |
| LLM (demo intermediário) | **Google Gemini** (`@google/genai`, function calling) |
| Armazenamento de áudio | Arquivos estáticos em **`public/audio/{tenant}/`** + URLs persistidas no banco |

**Porta dev:** `5000` (script `npm run dev`). **Produção:** respeita `PORT` da plataforma.

---

## 3. Modelo multi-tenant

- Cada **cidade** é um **tenant** definido em `src/config/tenants.ts`: `slug`, `name`, cores, **`voiceId` (ElevenLabs)**, **`rssUrl`**.
- Rotas dinâmicas: **`/[city]`** (ex.: `/louveira`, `/vinhedo`).
- A página inicial (`/`) redireciona para um tenant padrão (`/louveira`).

**Implicação comercial:** onboarding de novo município = configuração + eventual ajuste de categorização de RSS + voz + testes de ingestão.

---

## 4. Modelo de dados (Prisma)

Principais entidades (`prisma/schema.prisma`):

| Modelo | Função |
|--------|--------|
| **`NewsArticle`** | Artigo ingerido por `tenantSlug`, com título, resumo, imagem, `sourceUrl` único, categoria (string), `publishedAt`, **`audioUrl`** (MP3 público após TTS). |
| **`TenantLiaAsset`** | Metadados LIA por cidade: **`greetingAudioUrl`** (MP3 do menu/saudação gerado na ingestão). |

Índice em `tenantSlug` para leitura por cidade.

---

## 5. Fluxos principais

### 5.1 Ingestão (`POST /api/ingest`)

- **Autenticação:** header `Authorization: Bearer <INGEST_SECRET>`.
- **Corpo opcional:** `{ "tenantSlug": "..." }` (um tenant) ou omitido (todos).
- **Passos por tenant:** busca itens do RSS → `upsert` por `sourceUrl` → anexa TTS ao artigo quando aplicável → gera áudio **top 3** (resumo agregado, conforme implementação) → gera **áudio de saudação LIA** e atualiza `TenantLiaAsset`.

**Requisitos de ambiente:** `DATABASE_URL`, `INGEST_SECRET`, chave ElevenLabs para TTS.

**Uso típico comercial:** cron job (GitHub Actions, Cloud Scheduler, etc.) chamando o endpoint com segredo rotativo.

### 5.2 Experiência cidade (`CityExperience`)

- **“Falar com a LIA”:** toca o MP3 de saudação (se existir na base) ou TTS do texto gerado por `buildIngestGreetingScript`.
- **Reconhecimento de voz:** Web Speech API (`useVoiceUtterance`), modo **one-shot** após armar sessão.
- **Após o comando:** mensagem de espera (`LIA_WAIT_ACKNOWLEDGMENT`) → `parseVoiceIntent` → reprodução encadeada: intro (“localizei…”) → áudio(s) da(s) notícia(s) → fecho institucional (`buildLiaClosingLine`) → estado de “microfone desligado” na UI.

### 5.3 APIs de agente / integração

| Endpoint | Papel |
|----------|--------|
| **`GET /api/agent/news`** | Lista notícias ingeridas por `city`, com `q` e `limit`. Proteção opcional via `AGENT_TOOL_SECRET` ou `INGEST_SECRET`. |
| **`POST /api/agent/intermediary`** | Chat com Gemini: tool **`listar_noticias`** para buscar dados reais. Requer variáveis de ambiente da integração Gemini (ver código: `AI_INTEGRATIONS_GEMINI_API_KEY` e opcionalmente base URL). Auth opcional igual ao endpoint acima. |

**Página demo:** `/[city]/intermediario` (fluxo separado da experiência principal por voz).

### 5.4 TTS sob demanda (`/api/tts`)

Usado pelo cliente para falas dinâmicas quando não há MP3 pré-gerado (fallback).

---

## 6. Integrações externas e custos recorrentes

| Serviço | Uso no projeto | Observação comercial |
|---------|----------------|----------------------|
| **ElevenLabs** | TTS na ingestão + fallbacks no player | Custo **por caractere** / plano; escala com volume de matérias e regenerações. |
| **Google Gemini** | Apenas fluxo intermediário (demo) | Custo por tokens + chamadas de ferramenta; pode ser opcional para MVP “só voz + RSS”. |
| **PostgreSQL** | Persistência | Hosting gerenciado (RDS, Neon, Supabase, Replit DB, etc.). |

**Não há** no escopo atual: login de cidadão, painel admin web completo, CMS — configuração é principalmente **código + env + cron**.

---

## 7. Segurança e governança

- **Segredos** em ingestão e ferramentas de agente: Bearer tokens em variáveis de ambiente.
- **Conteúdo:** origem é **RSS oficial** do município; o sistema **não** substitui o portal — **republica em áudio** o que já foi publicado.
- **LGPD:** tratar logs de voz, IPs e telemetria conforme política do cliente; este repositório foca em **demo técnica** — políticas de retenção devem ser definidas no contrato/privacy notice do produto.

---

## 8. Limitações e riscos (para roadmap / precificação)

1. **Categorização:** inferência de categoria a partir de título/corpo do RSS (heurísticas); pode exigir **regras por cliente** ou modelo de classificação.
2. **Voz:** dependência de qualidade do feed (HTML, imagens, texto).
3. **STT no navegador:** varia por browser (Chrome/Edge recomendados); não é assistente em apps nativos sem trabalho extra.
4. **Escalabilidade de arquivos:** MP3 em `public/` ou storage compatível; em escala, migrar para **object storage** (S3, R2) com URLs assinadas ou CDN.
5. **Variáveis de ambiente (Gemini):** o código aceita **`GEMINI_API_KEY`** (preferido) ou **`AI_INTEGRATIONS_GEMINI_API_KEY`** (Replit); ver `src/lib/geminiEnv.ts` e `.env.example`.

---

## 9. Ângulos comerciais (produto / GTM)

- **White-label municipal:** mesmo core, identidade visual por tenant (cores já no config).
- **Pacotes:** “Portal + voz” (ingestão + player) vs. “+ Assistente conversacional Gemini” (add-on).
- **Serviço gerenciado:** cron de ingestão, monitoramento de feed, ajuste de voz e copy institucional (LIA).
- **Diferenciação:** foco em **comunicação pública** e **acessibilidade** (ouvir notícias dirigindo, baixa visão, idosos).

---

## 10. Estrutura de pastas (referência rápida)

- `src/app/[city]/` — páginas por cidade.
- `src/app/api/` — ingest, tts, agent.
- `src/components/` — `CityExperience`, `Orb`, `Captions`.
- `src/lib/` — RSS, Prisma, voz, intents, scripts LIA, ElevenLabs, storage de áudio.
- `src/hooks/` — playback e reconhecimento de voz.
- `prisma/schema.prisma` — schema do banco.

---

## 11. Como reproduzir localmente (resumo)

1. `npm install`
2. Configurar `.env` (ver `.env.example`): `DATABASE_URL`, `INGEST_SECRET`, chaves opcionais ElevenLabs / Gemini.
3. `npx prisma db push` (ou migrate) para criar tabelas.
4. `npm run dev` — acessar `http://localhost:5000/louveira` (ou outro slug).

---

**Fim do documento.** Pode ser colado integralmente no Gemini (ou outro modelo) para análise de mercado, precificação, riscos e comparação com concorrentes, desde que se informe também o **público-alvo** e a **região** desejada para respostas mais precisas.
