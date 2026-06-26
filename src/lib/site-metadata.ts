import type { Metadata } from "next";

export const SITE_NAME = "Guecho Rocambole";

export const SITE_DESCRIPTION =
  "Billetterie officielle Guecho Rocambole. Billets spectacle (Standard, VIP, VVIP) et streaming.";

export const SITE_OG_IMAGE = {
  path: "/img/preview.jpg",
  alt: "Guecho Rocambole — Billetterie officielle",
} as const;

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return "https://www.guechorocambole.com";
}

export function getMetadataBase() {
  return new URL(`${getSiteUrl()}/`);
}

export function buildSiteMetadata({
  title,
  description,
  path = "/",
  imagePath = SITE_OG_IMAGE.path,
  imageAlt = SITE_OG_IMAGE.alt,
}: {
  title?: string;
  description?: string;
  path?: string;
  imagePath?: string;
  imageAlt?: string;
} = {}): Metadata {
  const pageTitle = title ?? `${SITE_NAME} — Billetterie`;
  const pageDescription = description ?? SITE_DESCRIPTION;
  const canonicalUrl = path.startsWith("http") ? path : new URL(path, getMetadataBase()).toString();

  return {
    metadataBase: getMetadataBase(),
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      type: "website",
      locale: "fr_FR",
      url: canonicalUrl,
      siteName: SITE_NAME,
      title: pageTitle,
      description: pageDescription,
      images: [
        {
          url: imagePath,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [imagePath],
    },
  };
}

export const rootSiteMetadata = buildSiteMetadata();
