import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { requireAdminEvent } from "@/lib/admin";
import {
  getAdminStreamView,
  provisionIvsChannel,
  enableIvsPlaybackAuthorization,
  setStreamLive,
  updateStreamTitle,
} from "@/lib/streaming";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const event = await requireAdminEvent();
    const stream = await getAdminStreamView(event.id);
    return NextResponse.json({ stream });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de charger le streaming",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const event = await requireAdminEvent();
    const body = (await request.json()) as {
      action?: string;
      title?: string;
    };

    const action = body.action;

    if (action === "provision") {
      const result = await provisionIvsChannel(event.id);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (action === "go-live") {
      const result = await setStreamLive(event.id, true, body.title);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (action === "end-live") {
      const result = await setStreamLive(event.id, false);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (action === "update-title") {
      if (!body.title?.trim()) {
        return NextResponse.json({ error: "Titre requis" }, { status: 400 });
      }
      const result = await updateStreamTitle(event.id, body.title);
      return NextResponse.json(result);
    }

    if (action === "enable-playback-auth") {
      const result = await enableIvsPlaybackAuthorization(event.id);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erreur streaming",
      },
      { status: 500 },
    );
  }
}
