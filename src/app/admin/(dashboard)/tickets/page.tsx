import { requireAdminEvent } from "@/lib/admin";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { TicketTypesEditor } from "@/components/admin/TicketTypesEditor";
import { adminPagePadding, adminSectionGap } from "@/components/admin/admin-styles";

export default async function AdminTicketsPage() {
  const event = await requireAdminEvent();

  return (
    <div className={adminPagePadding}>
      <AdminTopBar
        eventTitle={event.title}
        subtitle={`${event.ticketTypes.length} type${event.ticketTypes.length > 1 ? "s" : ""} de billet · prix, stock et disponibilité`}
      />

      <div className={adminSectionGap}>
        <TicketTypesEditor ticketTypes={event.ticketTypes} />
      </div>
    </div>
  );
}
