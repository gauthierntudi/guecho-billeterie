import { requireAdminEvent } from "@/lib/admin";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStreamingPanel } from "@/components/admin/AdminStreamingPanel";
import {
  adminPagePadding,
  adminSectionGap,
} from "@/components/admin/admin-styles";

export default async function AdminStreamingPage() {
  const event = await requireAdminEvent();

  return (
    <div className={adminPagePadding}>
      <AdminTopBar
        eventTitle={event.title}
        subtitle="Canal AWS IVS · OBS · activation du live public"
      />

      <div className={adminSectionGap}>
        <AdminStreamingPanel />
      </div>
    </div>
  );
}
