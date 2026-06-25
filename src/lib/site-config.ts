export type SocialPlatform =
  | "instagram"
  | "facebook"
  | "youtube"
  | "tiktok"
  | "x"
  | "whatsapp";

export type SocialLink = {
  platform: SocialPlatform;
  href: string;
  label: string;
};

export type ContactLink = {
  display: string;
  href: string;
};

const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X (Twitter)",
  whatsapp: "WhatsApp",
};

export const DEFAULT_EVENT_SLUG =
  process.env.NEXT_PUBLIC_DEFAULT_EVENT_SLUG ?? "guecho-live-2026";

export function getSocialLinks(): SocialLink[] {
  const candidates: Array<SocialLink | null> = [
    linkFromEnv("instagram", process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM),
    linkFromEnv("facebook", process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK),
    linkFromEnv("youtube", process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE),
    linkFromEnv("tiktok", process.env.NEXT_PUBLIC_SOCIAL_TIKTOK),
    linkFromEnv("x", process.env.NEXT_PUBLIC_SOCIAL_X),
    whatsAppLinkFromEnv(process.env.NEXT_PUBLIC_SOCIAL_WHATSAPP),
  ];

  return candidates.filter((link): link is SocialLink => link !== null);
}

export function getContactPhone(): ContactLink | null {
  const value = process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim();
  if (!value) return null;

  return {
    display: value,
    href: `tel:${value.replace(/[^\d+]/g, "")}`,
  };
}

export function getContactWhatsApp(): ContactLink | null {
  const value =
    process.env.NEXT_PUBLIC_CONTACT_WHATSAPP?.trim() ||
    process.env.NEXT_PUBLIC_SOCIAL_WHATSAPP?.trim();
  if (!value) return null;

  return {
    display: formatWhatsAppDisplay(value),
    href: toWhatsAppHref(value),
  };
}

function linkFromEnv(
  platform: SocialPlatform,
  href: string | undefined,
): SocialLink | null {
  const trimmed = href?.trim();
  if (!trimmed) return null;

  return {
    platform,
    href: trimmed,
    label: SOCIAL_LABELS[platform],
  };
}

function whatsAppLinkFromEnv(href: string | undefined): SocialLink | null {
  const trimmed = href?.trim();
  if (!trimmed) return null;

  return {
    platform: "whatsapp",
    href: toWhatsAppHref(trimmed),
    label: SOCIAL_LABELS.whatsapp,
  };
}

function toWhatsAppHref(value: string) {
  if (value.startsWith("http")) return value;
  const digits = value.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

function formatWhatsAppDisplay(value: string) {
  if (value.startsWith("http")) {
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 10) {
      return `+${digits}`;
    }
    return "WhatsApp";
  }
  return value;
}

export const FOOTER_NAV = [
  { href: "/", label: "Accueil" },
  {
    href: `/evenement/${DEFAULT_EVENT_SLUG}`,
    label: "Événement",
  },
  {
    href: `/evenement/${DEFAULT_EVENT_SLUG}#billetterie`,
    label: "Billetterie",
  },
  {
    href: "/mes-billets",
    label: "Mes billets",
  },
  {
    href: `/evenement/${DEFAULT_EVENT_SLUG}#streaming`,
    label: "Streaming",
  },
] as const;
