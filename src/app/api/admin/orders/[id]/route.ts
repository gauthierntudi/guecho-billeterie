import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  generateMissingTicketsForOrder,
  getAdminOrder,
  requireAdminEvent,
  updateAdminOrder,
} from "@/lib/admin";
import { updateOrderSchema } from "@/lib/admin-validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const event = await requireAdminEvent();
    const { id } = await context.params;
    const order = await getAdminOrder(id, event.id);

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const event = await requireAdminEvent();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await updateAdminOrder(id, event.id, parsed.data);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ order: result.order });
  } catch {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }
}
