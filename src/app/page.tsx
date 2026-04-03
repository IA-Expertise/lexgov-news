import { redirect } from "next/navigation";

/** Entrada padrão para demo multi-tenant; use /[city] na URL (ex.: /vinhedo). */
export default function Home() {
  redirect("/louveira");
}
