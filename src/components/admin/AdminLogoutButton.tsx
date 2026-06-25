"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type AdminLogoutButtonProps = {
  className?: string;
  children?: React.ReactNode;
};

export function AdminLogoutButton({
  className,
  children,
}: AdminLogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleLogout} className={cn(className)}>
      {children ?? "Déconnexion"}
    </button>
  );
}
