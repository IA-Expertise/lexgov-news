import type { NewsCategory } from "@/mocks/news";

export const CATEGORY_ORDER: NewsCategory[] = ["saude", "obras", "educacao"];

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  saude: "Saúde",
  obras: "Obras",
  educacao: "Educação",
};

/** Cores por categoria (transição do Orbe ao selecionar tema) */
export const CATEGORY_COLORS: Record<NewsCategory, string> = {
  saude: "#00A86B",
  obras: "#E65100",
  educacao: "#1565C0",
};
