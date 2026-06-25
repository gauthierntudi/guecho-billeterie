"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-6 text-white antialiased">
        <p className="text-xs uppercase tracking-[0.4em] text-amber-400">
          Erreur critique
        </p>
        <h1 className="mt-4 text-3xl font-light">Application indisponible</h1>
        <p className="mt-4 max-w-md text-center text-sm text-white/50">
          {error.message || "Une erreur inattendue s'est produite."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 rounded-full bg-amber-400 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-black transition hover:bg-amber-300"
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
