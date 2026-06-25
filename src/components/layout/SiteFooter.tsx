import Link from "next/link";
import {
  Facebook,
  Instagram,
  Phone,
  Tiktok,
  TwitterX,
  Whatsapp,
  Youtube,
} from "react-bootstrap-icons";
import { Logo } from "@/components/brand/Logo";
import { EVENT_DATE, EVENT_TIME, EVENT_VENUE } from "@/lib/event-meta";
import {
  FOOTER_NAV,
  getContactPhone,
  getContactWhatsApp,
  getSocialLinks,
  type SocialPlatform,
} from "@/lib/site-config";
import { cn } from "@/lib/utils";

type SiteFooterProps = {
  bareBackground?: boolean;
};

const SOCIAL_ICONS = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  tiktok: Tiktok,
  x: TwitterX,
  whatsapp: Whatsapp,
} as const;

function SocialIcon({
  platform,
  className,
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  const Icon = SOCIAL_ICONS[platform];
  return <Icon className={className} aria-hidden />;
}

export function SiteFooter({ bareBackground = false }: SiteFooterProps) {
  const socialLinks = getSocialLinks();
  const contactPhone = getContactPhone();
  const contactWhatsApp = getContactWhatsApp();
  const year = new Date().getFullYear();
  const hasSocialSection =
    socialLinks.length > 0 || contactPhone !== null || contactWhatsApp !== null;

  return (
    <footer
      className={cn(
        "relative px-4 py-14 sm:px-6 sm:py-16",
        !bareBackground && "bg-[#050505]",
      )}
    >
      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          <div className="space-y-4 lg:col-span-1">
            <Logo href="/" size="sm" />
            <p className="max-w-xs text-sm leading-relaxed text-white/50">
              Billetterie officielle de Guecho Rocambole — spectacle live et
              streaming.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-400">
              Navigation
            </p>
            <ul className="mt-5 space-y-3">
              {FOOTER_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/65 transition hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-400">
              Événement
            </p>
            <ul className="mt-5 flex flex-col gap-2.5">
              <li>
                <span className="inline-flex max-w-full rounded-full bg-[#fe9800] px-3.5 py-2 font-[family-name:var(--font-anton)] text-[11px] uppercase leading-tight text-black sm:text-xs">
                  {EVENT_DATE}
                </span>
              </li>
              <li>
                <span className="inline-flex max-w-full rounded-full bg-[#0f1f4d] px-3.5 py-2 font-[family-name:var(--font-anton)] text-[11px] uppercase leading-tight text-white sm:text-xs">
                  {EVENT_VENUE}
                </span>
              </li>
              <li>
                <span className="inline-flex max-w-full flex-col rounded-full bg-[#38bdf8] px-3.5 py-2 text-black">
                  <span className="font-[family-name:var(--font-anton)] text-[8px] normal-case tracking-[0.08em] text-black/60 sm:text-[9px]">
                    À partir de
                  </span>
                  <span className="font-[family-name:var(--font-anton)] text-sm uppercase leading-none sm:text-base">
                    {EVENT_TIME}
                  </span>
                </span>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-400">
              Réseaux sociaux
            </p>
            {hasSocialSection ? (
              <>
                {socialLinks.length > 0 ? (
                  <ul className="mt-5 flex flex-wrap gap-3">
                    {socialLinks.map((social) => (
                      <li key={social.platform}>
                        <a
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={social.label}
                          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/75 transition hover:border-amber-400/50 hover:bg-amber-400/10 hover:text-amber-200"
                        >
                          <SocialIcon
                            platform={social.platform}
                            className="h-[18px] w-[18px]"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {contactPhone || contactWhatsApp ? (
                  <ul className="mt-5 space-y-3 border-t border-white/10 pt-5">
                    {contactPhone ? (
                      <li>
                        <a
                          href={contactPhone.href}
                          className="inline-flex items-center gap-2.5 text-sm text-white/70 transition hover:text-white"
                        >
                          <Phone className="h-4 w-4 shrink-0 text-amber-400/85" />
                          <span>{contactPhone.display}</span>
                        </a>
                      </li>
                    ) : null}
                    {contactWhatsApp ? (
                      <li>
                        <a
                          href={contactWhatsApp.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2.5 text-sm text-white/70 transition hover:text-emerald-300"
                        >
                          <Whatsapp className="h-4 w-4 shrink-0 text-emerald-400/90" />
                          <span>{contactWhatsApp.display}</span>
                        </a>
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </>
            ) : (
              <p className="mt-5 text-sm text-white/40">
                Bientôt disponible — configurez les liens dans{" "}
                <code className="text-white/55">.env</code>.
              </p>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-center text-xs text-white/40 sm:flex-row sm:text-left">
          <p>© {year} Guecho Rocambole — Tous droits réservés</p>
          <p className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            Paiement sécurisé
          </p>
        </div>
      </div>
    </footer>
  );
}
