export type NewsCategory = "saude" | "obras" | "educacao";

export type NewsItem = {
  id: string;
  tenantSlug: string;
  category: NewsCategory;
  title: string;
  summary: string;
  audioUrl: string;
  imageUrl: string;
  /** ISO 8601 quando vier do banco (ingestão RSS) */
  publishedAt?: string;
};

export const newsItems: NewsItem[] = [
  {
    id: "louveira-saude-1",
    tenantSlug: "louveira",
    category: "saude",
    title: "Mutirão contra a dengue reforça ações em Louveira",
    summary:
      "A Prefeitura de Louveira intensificou o mutirão de combate à dengue nos bairros prioritários. Equipes visitam residências, orientam moradores e eliminam focos do mosquito transmissor. Participe: água parada é risco para todos.",
    audioUrl: "https://example.com/audio/louveira-saude-mutirao-dengue.mp3",
    imageUrl:
      "https://louveira.sp.gov.br/uploads/noticia/mutirao-dengue-louveira.jpg",
  },
  {
    id: "louveira-obras-1",
    tenantSlug: "louveira",
    category: "obras",
    title: "Pavimentação e drenagem avançam em vias estratégicas",
    summary:
      "Obras de infraestrutura seguem cronograma com pavimentação e melhoria da drenagem em vias que beneficiam o tráfego e a segurança dos pedestres. Acompanhe os desvios sinalizados e priorize rotas alternativas nos horários de pico.",
    audioUrl: "https://example.com/audio/louveira-obras-pavimentacao.mp3",
    imageUrl:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80",
  },
  {
    id: "louveira-educacao-1",
    tenantSlug: "louveira",
    category: "educacao",
    title: "Matrículas e programas escolares com informações centralizadas",
    summary:
      "A rede municipal divulga calendário de matrículas e reforça o acesso a programas de apoio à aprendizagem. Pais e responsáveis podem consultar os canais oficiais para documentação e prazos.",
    audioUrl: "https://example.com/audio/louveira-educacao-matriculas.mp3",
    imageUrl:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
  },
  {
    id: "vinhedo-saude-1",
    tenantSlug: "vinhedo",
    category: "saude",
    title: "Atenção Básica amplia horários de consultas na rede municipal",
    summary:
      "Vinhedo reorganiza a Atenção Básica para ampliar o acesso a consultas e vacinação. Confira os horários atualizados nas unidades de saúde e utilize o agendamento pelos canais oficiais da prefeitura.",
    audioUrl: "https://example.com/audio/vinhedo-saude-atencao-basica.mp3",
    imageUrl:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
  },
  {
    id: "vinhedo-obras-1",
    tenantSlug: "vinhedo",
    category: "obras",
    title: "Revitalização de praças e iluminação pública em andamento",
    summary:
      "Obras de revitalização de praças e modernização da iluminação pública avançam em várias regiões. A prefeitura pede atenção à sinalização temporária e ao uso de faixas de pedestres em trechos em intervenção.",
    audioUrl: "https://example.com/audio/vinhedo-obras-pracas.mp3",
    imageUrl:
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80",
  },
  {
    id: "vinhedo-educacao-1",
    tenantSlug: "vinhedo",
    category: "educacao",
    title: "Formação de educadores e novas turmas de reforço escolar",
    summary:
      "A Secretaria de Educação anuncia ciclos de formação para educadores e abertura de turmas de reforço. Famílias devem acompanhar comunicados das escolas para inscrições e calendário de atividades.",
    audioUrl: "https://example.com/audio/vinhedo-educacao-reforco.mp3",
    imageUrl:
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
  },
];

export function getNewsByTenantSlug(tenantSlug: string): NewsItem[] {
  return newsItems.filter(
    (n) => n.tenantSlug.toLowerCase() === tenantSlug.toLowerCase()
  );
}

export function getNewsByTenantAndCategory(
  tenantSlug: string,
  category: NewsCategory
): NewsItem | undefined {
  return newsItems.find(
    (n) =>
      n.tenantSlug.toLowerCase() === tenantSlug.toLowerCase() &&
      n.category === category
  );
}
