/** Texto puro, sem deps Node — pode ser importado em componentes cliente. */
export function buildTop3Script(titles: string[]): string {
  if (titles.length === 0) return "Não há notícias disponíveis no momento.";
  if (titles.length === 1) return `Encontrei a seguinte notícia: ${titles[0]}.`;
  if (titles.length === 2)
    return `Encontrei as seguintes notícias: ${titles[0]} e ${titles[1]}.`;
  const last = titles[titles.length - 1];
  const rest = titles.slice(0, -1).join(", ");
  return `Encontrei as seguintes notícias: ${rest} e ${last}.`;
}
