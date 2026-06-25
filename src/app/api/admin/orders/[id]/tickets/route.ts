import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { generateMissingTicketsForOrder, requireAdminEvent } from "@/lib/admin";

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
    const result = await generateMissingTicketsForOrder(id, event.id);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      created: result.created,
      order: result.order,
    });
  } catch {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }
}
