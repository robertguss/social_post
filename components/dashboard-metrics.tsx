"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { IconTrendingUp, IconCalendarEvent, IconCheck, IconAlertCircle, IconLink } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardMetrics() {
  const stats = useQuery(api.dashboard.getDashboardStats);

  if (stats === undefined) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Total Posts */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Posts</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalPosts}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              All time
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Content created
          </div>
          <div className="text-muted-foreground">
            Total posts across all platforms
          </div>
        </CardFooter>
      </Card>

      {/* Scheduled Posts */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Scheduled Posts</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.scheduledPosts}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconCalendarEvent />
              Pending
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Ready to publish
          </div>
          <div className="text-muted-foreground">
            Posts waiting to be published
          </div>
        </CardFooter>
      </Card>

      {/* Published Posts */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Published Posts</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.publishedPosts}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconCheck />
              Success
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Successfully published
          </div>
          <div className="text-muted-foreground">
            Posts published to platforms
          </div>
        </CardFooter>
      </Card>

      {/* Connected Platforms */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Connected Platforms</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.connectedPlatforms}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconLink />
              Active
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.failedPosts > 0 ? `${stats.failedPosts} failed` : "All systems operational"}
          </div>
          <div className="text-muted-foreground">
            Social accounts connected
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="@container/card">
          <CardHeader>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
