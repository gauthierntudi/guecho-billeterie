import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { adminCard } from "@/components/admin/admin-styles";

export const metadata: Metadata = {
  title: "Connexion admin — Guecho",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef1f6] px-4 text-zinc-900">
      <div className="w-full max-w-md px-2">
        <div className={`${adminCard} overflow-hidden shadow-[0_10px_50px_rgba(15,23,42,0.08)]`}>
          <div className="border-b border-zinc-100 px-8 py-6">
            <Logo href="/" size="sm" />
          </div>
          <div className="px-8 py-8">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Connexion
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Accès réservé à la gestion des billets et des transactions.
            </p>
            <div className="mt-8">
              <Suspense
                fallback={
                  <div className="h-20 animate-pulse rounded-2xl bg-zinc-100" />
                }
              >
                <AdminLoginForm />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
