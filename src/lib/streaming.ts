import { OrderStatus, TicketStatus } from "@prisma/client";
import { DEFAULT_EVENT_SLUG } from "@/lib/site-config";
import {
  buildRtmpIngestUrl,
  createIvsChannel,
  getIvsStreamState,
  isIvsConfigured,
  setIvsChannelAuthorized,
} from "@/lib/ivs";
import { isIvsPlaybackAuthConfigured } from "@/lib/ivs-playback-token";
import { getPhoneLookupVariants } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { isStreamingTicket } from "@/types/ticketing";

function sanitizeChannelName(slug: string) {
  return `guecho-${slug}`
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 128);
}

export async function getStreamConfigByEventSlug(slug?: string) {
  const eventSlug = slug ?? DEFAULT_EVENT_SLUG;

  return prisma.streamConfig.findFirst({
    where: { event: { slug: eventSlug, isActive: true } },
    include: {
      event: {
        select: {
          id: true,
          slug: true,
          title: true,
        },
      },
    },
  });
}

export async function getOrCreateStreamConfigForEvent(eventId: string) {
  const existing = await prisma.streamConfig.findUnique({
    where: { eventId },
    include: {
      event: { select: { id: true, slug: true, title: true } },
    },
  });

  if (existing) return existing;

  return prisma.streamConfig.create({
    data: {
      eventId,
      title: "Guecho Rocambole — Live",
    },
    include: {
      event: { select: { id: true, slug: true, title: true } },
    },
  });
}

export type AdminStreamView = {
  configured: boolean;
  awsReady: boolean;
  event: { id: string; slug: string; title: string };
  title: string | null;
  isLive: boolean;
  channelArn: string | null;
  channelName: string | null;
  ingestEndpoint: string | null;
  rtmpServer: string | null;
  streamKeyValue: string | null;
  playbackUrl: string | null;
  awsBroadcasting: boolean;
  awsHealth?: string;
  awsViewerCount?: number;
  awsStartTime?: string;
};

export async function getAdminStreamView(
  eventId: string,
): Promise<AdminStreamView> {
  const config = await getOrCreateStreamConfigForEvent(eventId);
  const awsReady = isIvsConfigured();

  let awsBroadcasting = false;
  let awsHealth: string | undefined;
  let awsViewerCount: number | undefined;
  let awsStartTime: string | undefined;

  if (awsReady && config.channelArn) {
    try {
      const state = await getIvsStreamState(config.channelArn);
      awsBroadcasting = state.isBroadcasting;
      awsHealth = state.health;
      awsViewerCount = state.viewerCount;
      awsStartTime = state.startTime;
    } catch {
      // Keep local state if AWS check fails temporarily
    }
  }

  return {
    configured: Boolean(config.channelArn && config.playbackUrl),
    awsReady,
    event: config.event,
    title: config.title,
    isLive: config.isLive,
    channelArn: config.channelArn,
    channelName: config.channelName,
    ingestEndpoint: config.ingestEndpoint,
    rtmpServer: config.ingestEndpoint
      ? buildRtmpIngestUrl(config.ingestEndpoint)
      : null,
    streamKeyValue: config.streamKeyValue,
    playbackUrl: config.playbackUrl,
    awsBroadcasting,
    awsHealth,
    awsViewerCount,
    awsStartTime,
  };
}

export async function provisionIvsChannel(eventId: string) {
  if (!isIvsConfigured()) {
    return { error: "Credentials AWS manquants (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)" };
  }

  const config = await getOrCreateStreamConfigForEvent(eventId);

  if (config.channelArn && config.playbackUrl && config.streamKeyValue) {
    return { stream: await getAdminStreamView(eventId) };
  }

  const created = await createIvsChannel(
    sanitizeChannelName(config.event.slug),
  );

  await prisma.streamConfig.update({
    where: { id: config.id },
    data: {
      channelArn: created.channelArn,
      channelName: created.channelName,
      streamKeyArn: created.streamKeyArn,
      streamKeyValue: created.streamKeyValue,
      ingestEndpoint: created.ingestEndpoint,
      playbackUrl: created.playbackUrl,
      title: config.title ?? `${config.event.title} — Live`,
    },
  });

  return { stream: await getAdminStreamView(eventId) };
}

export async function enableIvsPlaybackAuthorization(eventId: string) {
  if (!isIvsConfigured()) {
    return { error: "Credentials AWS manquants" };
  }
  if (!isIvsPlaybackAuthConfigured()) {
    return {
      error:
        "IVS_PLAYBACK_PRIVATE_KEY manquant. Générez une clé ECDSA P-384 et importez la clé publique dans IVS.",
    };
  }

  const config = await getOrCreateStreamConfigForEvent(eventId);
  if (!config.channelArn) {
    return { error: "Créez d'abord le canal IVS" };
  }

  await setIvsChannelAuthorized(config.channelArn, true);
  return { stream: await getAdminStreamView(eventId) };
}

export async function setStreamLive(
  eventId: string,
  isLive: boolean,
  title?: string,
) {
  const config = await getOrCreateStreamConfigForEvent(eventId);

  if (!config.playbackUrl || !config.channelArn) {
    return {
      error: "Créez d'abord le canal IVS avant de passer en live",
    };
  }

  await prisma.streamConfig.update({
    where: { id: config.id },
    data: {
      isLive,
      ...(title?.trim() ? { title: title.trim() } : {}),
    },
  });

  return { stream: await getAdminStreamView(eventId) };
}

export async function updateStreamTitle(eventId: string, title: string) {
  const config = await getOrCreateStreamConfigForEvent(eventId);

  await prisma.streamConfig.update({
    where: { id: config.id },
    data: { title: title.trim() || null },
  });

  return { stream: await getAdminStreamView(eventId) };
}

export type PublicStreamStatus = {
  isLive: boolean;
  title: string | null;
  eventTitle: string;
  eventSlug: string;
  hasChannel: boolean;
};

export async function getPublicStreamStatus(
  slug?: string,
): Promise<PublicStreamStatus | null> {
  const eventSlug = slug ?? DEFAULT_EVENT_SLUG;
  const event = await prisma.event.findUnique({
    where: { slug: eventSlug, isActive: true },
    include: { streamConfig: true },
  });

  if (!event) return null;

  return {
    isLive: Boolean(event.streamConfig?.isLive && event.streamConfig.playbackUrl),
    title: event.streamConfig?.title ?? null,
    eventTitle: event.title,
    eventSlug: event.slug,
    hasChannel: Boolean(event.streamConfig?.playbackUrl),
  };
}

export type StreamAccessResult =
  | {
      success: true;
      isLive: boolean;
      playbackUrl: string | null;
      title: string | null;
      eventTitle: string;
      ticketCode: string;
      attendeeName: string | null;
      sessionId: string | null;
    }
  | { success: false; error: string };

export const MAX_STREAM_SESSIONS_PER_TICKET = 2;
/** Session stays active if heartbeaten within this window. */
export const STREAM_SESSION_TTL_MS = 120_000;

function staleSessionCutoff(now = new Date()) {
  return new Date(now.getTime() - STREAM_SESSION_TTL_MS);
}

/**
 * Claims one of two fixed slots per ticket. The unique (ticketCode, slot)
 * constraint enforces the limit even when Neon pooler races bypass advisory locks.
 */
export async function claimStreamViewerSession(
  ticketCode: string,
  sessionId?: string | null,
): Promise<{ success: true; sessionId: string } | { success: false; error: string }> {
  const code = ticketCode.trim().toUpperCase();
  if (!code) {
    return { success: false, error: "Code billet requis" };
  }

  const now = new Date();
  const staleBefore = staleSessionCutoff(now);

  try {
    // Reconnect existing session if still present for this ticket.
    if (sessionId) {
      const existing = await prisma.streamViewerSession.findFirst({
        where: { id: sessionId, ticketCode: code },
      });
      if (existing) {
        await prisma.streamViewerSession.update({
          where: { id: existing.id },
          data: { lastSeenAt: now },
        });
        return { success: true, sessionId: existing.id };
      }
    }

    // Free expired seats before allocating (single ticket scope).
    await prisma.streamViewerSession.deleteMany({
      where: {
        ticketCode: code,
        lastSeenAt: { lt: staleBefore },
      },
    });

    for (let slot = 1; slot <= MAX_STREAM_SESSIONS_PER_TICKET; slot += 1) {
      try {
        const created = await prisma.streamViewerSession.create({
          data: {
            ticketCode: code,
            slot,
            lastSeenAt: now,
          },
        });
        return { success: true, sessionId: created.id };
      } catch {
        // Slot taken (unique) — try the next one.
      }
    }

    return {
      success: false,
      error:
        "Limite atteinte : 2 connexions simultanées maximum pour ce billet. Fermez un autre appareil via « Changer d’accès » ou réessayez dans 2 minutes.",
    };
  } catch {
    return {
      success: false,
      error: "Impossible de réserver une place de visionnage",
    };
  }
}

export async function heartbeatStreamViewerSession(
  sessionId: string,
  ticketCode: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const code = ticketCode.trim().toUpperCase();
  const updated = await prisma.streamViewerSession.updateMany({
    where: { id: sessionId, ticketCode: code },
    data: { lastSeenAt: new Date() },
  });

  if (updated.count === 0) {
    return { success: false, error: "Session expirée ou invalide" };
  }

  return { success: true };
}

export async function releaseStreamViewerSession(
  sessionId: string,
  ticketCode?: string,
) {
  const code = ticketCode?.trim().toUpperCase();
  await prisma.streamViewerSession.deleteMany({
    where: {
      id: sessionId,
      ...(code ? { ticketCode: code } : {}),
    },
  });
}

const ticketAccessInclude = {
  orderItem: {
    include: {
      ticketType: true,
      order: {
        include: {
          event: { include: { streamConfig: true } },
        },
      },
    },
  },
};

type TicketAccessRecord = {
  ticketCode: string;
  attendeeName: string | null;
  status: TicketStatus;
  orderItem: {
    ticketType: {
      category: import("@prisma/client").TicketCategory;
      tier: import("@prisma/client").TicketTier;
    };
    order: {
      status: OrderStatus;
      event: {
        title: string;
        slug: string;
        streamConfig: {
          isLive: boolean;
          playbackUrl: string | null;
          title: string | null;
        } | null;
      };
    };
  };
};

function buildAccessFromTicket(
  ticket: TicketAccessRecord,
  eventSlug: string,
  sessionId: string | null = null,
): StreamAccessResult {
  if (ticket.status !== TicketStatus.VALID) {
    return { success: false, error: "Ce billet n'est plus valide" };
  }

  const order = ticket.orderItem.order;
  if (order.status !== OrderStatus.PAID) {
    return { success: false, error: "Paiement non confirmé pour ce billet" };
  }

  if (order.event.slug !== eventSlug) {
    return {
      success: false,
      error: "Ce billet ne correspond pas à cet événement",
    };
  }

  if (!isStreamingTicket(ticket.orderItem.ticketType)) {
    return {
      success: false,
      error: "Ce billet n'est pas un accès streaming",
    };
  }

  const stream = order.event.streamConfig;
  const isLive = Boolean(stream?.isLive && stream.playbackUrl);

  return {
    success: true,
    isLive,
    playbackUrl: isLive ? stream!.playbackUrl : null,
    title: stream?.title ?? null,
    eventTitle: order.event.title,
    ticketCode: ticket.ticketCode,
    attendeeName: ticket.attendeeName,
    sessionId,
  };
}

export async function grantStreamAccessByTicketCode(
  ticketCode: string,
  slug?: string,
  sessionId?: string | null,
): Promise<StreamAccessResult> {
  const code = ticketCode.trim().toUpperCase();
  if (!code) {
    return { success: false, error: "Code billet requis" };
  }

  const eventSlug = slug ?? DEFAULT_EVENT_SLUG;

  const ticket = await prisma.ticket.findUnique({
    where: { ticketCode: code },
    include: ticketAccessInclude,
  });

  if (!ticket) {
    return { success: false, error: "Billet introuvable" };
  }

  const access = buildAccessFromTicket(ticket, eventSlug);
  if (!access.success) return access;

  // Reserve a seat immediately (waiting room + live) so limits apply early.
  const claim = await claimStreamViewerSession(code, sessionId);
  if (!claim.success) return claim;

  return { ...access, sessionId: claim.sessionId };
}

export async function grantStreamAccessByPhone(
  phone: string,
  slug?: string,
  sessionId?: string | null,
): Promise<StreamAccessResult> {
  const variants = getPhoneLookupVariants(phone);
  if (!variants.length) {
    return { success: false, error: "Numéro de téléphone requis" };
  }

  const eventSlug = slug ?? DEFAULT_EVENT_SLUG;

  const tickets = await prisma.ticket.findMany({
    where: {
      status: TicketStatus.VALID,
      orderItem: {
        order: {
          status: OrderStatus.PAID,
          customerPhone: { in: variants },
          event: { slug: eventSlug, isActive: true },
        },
        ticketType: {
          OR: [{ category: "STREAMING" }, { tier: "STREAMING_ACCESS" }],
        },
      },
    },
    include: ticketAccessInclude,
    // Oldest first: fill ticket #1 (2 slots), then #2, etc.
    orderBy: { issuedAt: "asc" },
  });

  if (!tickets.length) {
    return {
      success: false,
      error: "Aucun billet streaming trouvé pour ce numéro",
    };
  }

  // Reconnect to the same ticket/session when possible.
  if (sessionId) {
    const existingSession = await prisma.streamViewerSession.findFirst({
      where: { id: sessionId },
    });
    if (
      existingSession &&
      tickets.some((ticket) => ticket.ticketCode === existingSession.ticketCode)
    ) {
      return grantStreamAccessByTicketCode(
        existingSession.ticketCode,
        eventSlug,
        sessionId,
      );
    }
  }

  let lastLimitError: string | null = null;
  let lastAccessError: string | null = null;

  for (const ticket of tickets) {
    const access = buildAccessFromTicket(ticket, eventSlug);
    if (!access.success) {
      lastAccessError = access.error;
      continue;
    }

    const claim = await claimStreamViewerSession(ticket.ticketCode, null);
    if (claim.success) {
      return { ...access, sessionId: claim.sessionId };
    }

    lastLimitError = claim.error;
  }

  return {
    success: false,
    error:
      lastLimitError ??
      lastAccessError ??
      "Tous les billets streaming de ce numéro ont atteint la limite de 2 connexions simultanées.",
  };
}

export async function grantStreamAccess(input: {
  ticketCode?: string;
  phone?: string;
  slug?: string;
  sessionId?: string | null;
}): Promise<StreamAccessResult> {
  const ticketCode = input.ticketCode?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";

  if (ticketCode) {
    return grantStreamAccessByTicketCode(
      ticketCode,
      input.slug,
      input.sessionId,
    );
  }

  if (phone) {
    return grantStreamAccessByPhone(phone, input.slug, input.sessionId);
  }

  return {
    success: false,
    error: "Code billet ou numéro de téléphone requis",
  };
}
