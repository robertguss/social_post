"use client";

import { PostScheduler } from "@/components/features/PostScheduler";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export default function SchedulePage() {
  const searchParams = useSearchParams();
  const postId = searchParams.get("postId");

  // Fetch post if postId exists (for cloning or editing drafts)
  const post = useQuery(
    api.posts.getPost,
    postId ? { postId: postId as Id<"posts"> } : "skip"
  );

  // Determine if we're loading a draft post
  const isDraftLoading = postId && post === undefined;
  const draftPost = postId && post ? post : null;

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
                {draftPost
                  ? "Edit your draft post"
                  : "Create and schedule content for X/Twitter and LinkedIn"}
              </p>
            </div>
            {isDraftLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading draft post...</p>
              </div>
            ) : (
              <PostScheduler
                mode={draftPost ? "edit" : "create"}
                postData={
                  draftPost
                    ? {
                        _id: draftPost._id,
                        twitterContent: draftPost.twitterContent,
                        linkedInContent: draftPost.linkedInContent,
                        twitterScheduledTime: draftPost.twitterScheduledTime,
                        linkedInScheduledTime: draftPost.linkedInScheduledTime,
                        url: draftPost.url || undefined,
                        clonedFromPostId: draftPost.clonedFromPostId,
                      }
                    : undefined
                }
              />
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
