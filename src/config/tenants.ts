export type TenantConfig = {
  id: string;
  slug: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  voiceId: string;
  rssUrl: string;
};

/** Cor de entrada do Orbe LIA (marca LexGov) antes da seleção de categoria */
export const LEXGOV_BRAND_BLUE = "#2563EB";

export const tenants: Record<string, TenantConfig> = {
  louveira: {
    id: "louveira",
    slug: "louveira",
    name: "Louveira",
    primaryColor: "#0047AB",
    secondaryColor: "#87CEEB",
    voiceId: "Nicole",
    rssUrl: "https://louveira.sp.gov.br/rss.xml",
  },
  vinhedo: {
    id: "vinhedo",
    slug: "vinhedo",
    name: "Vinhedo",
    primaryColor: "#008000",
    secondaryColor: "#90EE90",
    voiceId: "Sarah",
    rssUrl: "https://vinhedo.sp.gov.br/rss.xml",
  },
};

export function getTenantBySlug(slug: string): TenantConfig | undefined {
  return tenants[slug.toLowerCase()];
}

export const tenantSlugs = Object.keys(tenants);
