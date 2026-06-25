import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAdminStats, requireAdminEvent } from "@/lib/admin";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const event = await requireAdminEvent();
    const stats = await getAdminStats(event.id);
    return NextResponse.json({ event: { id: event.id, title: event.title }, stats });
  } catch {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }
}
