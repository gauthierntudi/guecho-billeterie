import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAdminOrder, requireAdminEvent } from "@/lib/admin";
import { fulfillOrder } from "@/lib/ticketing";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const event = await requireAdminEvent();
    const { id } = await context.params;
    const existing = await getAdminOrder(id, event.id);

    if (!existing) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    if (existing.status === "PAID") {
      return NextResponse.json(
        { error: "Cette commande est déjà payée" },
        { status: 400 },
      );
    }

    if (existing.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Impossible de confirmer une commande annulée" },
        { status: 400 },
      );
    }

    const order = await fulfillOrder(id);
    if (!order) {
      return NextResponse.json(
        { error: "Confirmation impossible" },
        { status: 400 },
      );
    }

    const refreshed = await getAdminOrder(id, event.id);
    return NextResponse.json({ order: refreshed });
  } catch {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }
}
