"use client"

import * as React from "react"
import {
  IconCalendarEvent,
  IconClock,
  IconDashboard,
  IconHelp,
  IconRepeat,
  IconSettings,
  IconShare3,
  IconTemplate,
} from "@tabler/icons-react"
import { useUser } from "@clerk/nextjs"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Schedule Post",
      url: "/schedule",
      icon: IconCalendarEvent,
    },
    {
      title: "Post History",
      url: "/history",
      icon: IconClock,
    },
    {
      title: "Templates",
      url: "/templates",
      icon: IconTemplate,
    },
    {
      title: "Queues",
      url: "/queues",
      icon: IconRepeat,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser()

  const userData = {
    name: user?.fullName || user?.firstName || "User",
    email: user?.emailAddresses?.[0]?.emailAddress || "",
    avatar: user?.imageUrl || "",
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard">
                <IconShare3 className="!size-5" />
                <span className="text-base font-semibold">SocialPost</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
