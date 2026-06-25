import Link from "next/link";
import { adminBtnPrimary, adminBtnSecondary } from "@/components/admin/admin-styles";

type Action = {
  href: string;
  label: string;
  primary?: boolean;
  external?: boolean;
};

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: Action[];
};

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-sm text-zinc-500">{eyebrow}</p>
        ) : null}
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-zinc-500">{description}</p>
        ) : null}
      </div>

      {actions && actions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              target={action.external ? "_blank" : undefined}
              rel={action.external ? "noopener noreferrer" : undefined}
              className={action.primary ? adminBtnPrimary : adminBtnSecondary}
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  );
}
