import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { isAdminSessionValid } from "@/lib/adminSession";

export const dynamic = "force-dynamic";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) {
    return (
      <div className="min-h-screen bg-neutral-950 p-8 text-neutral-200">
        <p>Defina <code className="rounded bg-neutral-800 px-1">ADMIN_SECRET</code> no ambiente para usar o Modo Diretor.</p>
      </div>
    );
  }

  const token = cookies().get("lexgov_admin")?.value;
  if (!isAdminSessionValid(secret, token)) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-white">Modo Diretor — LexGov News</p>
          <div className="flex gap-4 text-sm">
            <Link
              href="/louveira"
              className="text-sky-400 underline-offset-2 hover:underline"
            >
              Ver portal
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
