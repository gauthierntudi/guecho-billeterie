import { OrderStatus, TicketStatus } from "@prisma/client";
import { DEFAULT_EVENT_SLUG } from "@/lib/site-config";
import {
  buildRtmpIngestUrl,
  createIvsChannel,
  getIvsStreamState,
  isIvsConfigured,
} from "@/lib/ivs";
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
    }
  | { success: false; error: string };

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
  };
}

export async function grantStreamAccessByTicketCode(
  ticketCode: string,
  slug?: string,
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

  return buildAccessFromTicket(ticket, eventSlug);
}

export async function grantStreamAccessByPhone(
  phone: string,
  slug?: string,
): Promise<StreamAccessResult> {
  const variants = getPhoneLookupVariants(phone);
  if (!variants.length) {
    return { success: false, error: "Numéro de téléphone requis" };
  }

  const eventSlug = slug ?? DEFAULT_EVENT_SLUG;

  const ticket = await prisma.ticket.findFirst({
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
    orderBy: { issuedAt: "desc" },
  });

  if (!ticket) {
    return {
      success: false,
      error: "Aucun billet streaming trouvé pour ce numéro",
    };
  }

  return buildAccessFromTicket(ticket, eventSlug);
}

export async function grantStreamAccess(input: {
  ticketCode?: string;
  phone?: string;
  slug?: string;
}): Promise<StreamAccessResult> {
  const ticketCode = input.ticketCode?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";

  if (ticketCode) {
    return grantStreamAccessByTicketCode(ticketCode, input.slug);
  }

  if (phone) {
    return grantStreamAccessByPhone(phone, input.slug);
  }

  return {
    success: false,
    error: "Code billet ou numéro de téléphone requis",
  };
}
