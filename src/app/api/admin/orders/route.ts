import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listAdminOrders, requireAdminEvent } from "@/lib/admin";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const event = await requireAdminEvent();
    const orders = await listAdminOrders(event.id);
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }
}
