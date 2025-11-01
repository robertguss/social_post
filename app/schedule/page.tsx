import { PostScheduler } from "@/components/features/PostScheduler";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export default function SchedulePage() {
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
          <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Schedule Post</h1>
              <p className="text-muted-foreground mt-2">
                Create and schedule content for X/Twitter
              </p>
            </div>
            <PostScheduler />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
