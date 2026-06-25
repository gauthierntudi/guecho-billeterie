import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-6 text-white">
      <p className="text-xs uppercase tracking-[0.4em] text-amber-400">404</p>
      <h1 className="mt-4 text-4xl font-light">Page introuvable</h1>
      <Link
        href="/"
        className="mt-8 text-sm uppercase tracking-widest text-white/50 transition hover:text-white"
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
