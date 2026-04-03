import type { NewsCategory } from "@/mocks/news";

export const CATEGORY_ORDER: NewsCategory[] = ["saude", "obras", "educacao"];

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  saude: "Saúde",
  obras: "Obras",
  educacao: "Educação",
};

/** Cores por categoria (Orbe + brilho das pílulas — Obras em âmbar quente, alinhado ao mock visual) */
export const CATEGORY_COLORS: Record<NewsCategory, string> = {
  saude: "#00C853",
  obras: "#FF9A3C",
  educacao: "#3B82F6",
};
