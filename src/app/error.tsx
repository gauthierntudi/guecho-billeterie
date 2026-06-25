"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-6 text-white">
      <p className="text-xs uppercase tracking-[0.4em] text-amber-400">Erreur</p>
      <h1 className="mt-4 text-3xl font-light">Un problème est survenu</h1>
      <p className="mt-4 max-w-md text-center text-sm text-white/50">
        {error.message || "Veuillez réessayer dans un instant."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-full bg-amber-400 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-black transition hover:bg-amber-300"
      >
        Réessayer
      </button>
    </main>
  );
}
