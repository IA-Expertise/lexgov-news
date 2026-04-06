"use client";

export function AdminLogoutButton() {
  return (
    <button
      type="button"
      className="text-neutral-400 underline-offset-2 hover:text-white hover:underline"
      onClick={async () => {
        await fetch("/api/admin/session", { method: "DELETE" });
        window.location.href = "/admin/login";
      }}
    >
      Sair
    </button>
  );
}
