import { NextResponse } from "next/server";
import { isPrismaConnectionError } from "@/lib/db-retry";
import { createOrderWithPayment } from "@/lib/ticketing";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createOrderWithPayment(body);

    if ("error" in result) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      return NextResponse.json(
        {
          error:
            "Connexion à la base de données temporairement indisponible. Réessayez dans quelques secondes.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Erreur serveur lors de la création de commande" },
      { status: 500 },
    );
  }
}
