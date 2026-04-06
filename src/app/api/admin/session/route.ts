import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminSessionToken } from "@/lib/adminSession";

/**
 * POST /api/admin/session — body `{ "password": "..." }` define cookie de sessão admin.
 * DELETE — encerra sessão.
 */
export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "ADMIN_SECRET não configurado no servidor" },
      { status: 503 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const password = body.password?.trim() ?? "";
  if (password !== secret) {
    return NextResponse.json({ error: "Senha inválida" }, { status: 401 });
  }

  const token = getAdminSessionToken(secret);
  const store = cookies();
  store.set("lexgov_admin", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = cookies();
  store.delete("lexgov_admin");
  return NextResponse.json({ ok: true });
}
