import { TemplateLibrary } from "@/components/features/TemplateLibrary";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export const metadata = {
  title: "Templates | Social Post Scheduler",
  description: "Manage your reusable content templates",
};

/**
 * Templates Page
 *
 * Displays a library of user's content templates with create, edit, and delete functionality.
 * Protected by Clerk middleware (configured in middleware.ts).
 */
export default function TemplatesPage() {
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
            <TemplateLibrary />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
