import { NextResponse } from "next/server";
import { isPrismaConnectionError, withDbRetry } from "@/lib/db-retry";
import { failOrderPayment } from "@/lib/ticketing";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    await withDbRetry(() => failOrderPayment(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      return NextResponse.json(
        { error: "Connexion à la base de données temporairement indisponible." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Impossible d'annuler la commande" },
      { status: 500 },
    );
  }
}
