import { QueueList } from "@/components/features/QueueList";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export const metadata = {
  title: "Recurring Queues | Social Post Scheduler",
  description: "Manage automated recurring posts",
};

/**
 * Queues Page
 *
 * Displays all user's recurring post queues with pause, resume, edit, and delete functionality.
 * Protected by Clerk middleware (configured in middleware.ts).
 */
export default function QueuesPage() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <main className="min-h-screen py-8">
            <QueueList />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
