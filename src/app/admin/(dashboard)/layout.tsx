import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { Logo } from "@/components/brand/Logo";
import { AdminProviders } from "@/components/admin/AdminProviders";
import { AdminCurrencySwitch } from "@/components/admin/AdminCurrencySwitch";
import { adminFrame, adminMain } from "@/components/admin/admin-styles";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!verifySessionToken(token)) {
    redirect("/admin/login");
  }

  return (
    <AdminProviders>
      <div className={adminFrame}>
      <div className="fixed inset-y-0 left-0 z-30 hidden w-[260px] bg-white lg:block">
        <AdminSidebar />
      </div>

      <div className={`flex min-w-0 flex-1 flex-col lg:ml-[260px] ${adminMain}`}>
        <div className="border-b border-zinc-200 bg-white px-4 py-4 lg:hidden">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Logo href="/admin" size="sm" />
            <AdminLogoutButton className="text-sm text-zinc-500 hover:text-zinc-900" />
          </div>
          <div className="mb-4">
            <AdminCurrencySwitch />
          </div>
          <AdminNav />
        </div>

        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
    </AdminProviders>
  );
}
