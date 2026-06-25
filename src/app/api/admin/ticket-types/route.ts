import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { requireAdminEvent, updateTicketType } from "@/lib/admin";
import { updateTicketTypeSchema } from "@/lib/admin-validators";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const event = await requireAdminEvent();
    return NextResponse.json({ ticketTypes: event.ticketTypes });
  } catch {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...payload } = body as { id?: string };
  if (!id) {
    return NextResponse.json({ error: "ID requis" }, { status: 400 });
  }

  const parsed = updateTicketTypeSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await updateTicketType(id, parsed.data);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ticketType: result.ticketType });
}
