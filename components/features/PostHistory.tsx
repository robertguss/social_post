"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Id } from "@/convex/_generated/dataModel";
import { PostScheduler } from "./PostScheduler";

/**
 * PostHistory Component
 *
 * Displays a list of scheduled and published posts with filtering options.
 * Features:
 * - Date range filter (Last 7/30/90 Days, All Time, Custom)
 * - Platform filter (X/Twitter only initially)
 * - Status badges with color coding
 * - Post details modal
 * - Real-time updates via Convex reactive queries
 */
export function PostHistory() {
  // Date range state
  type DateRangeOption = "7days" | "30days" | "90days" | "all";
  const [dateRange, setDateRange] = useState<DateRangeOption>("30days");

  // Platform filter state (X/Twitter only for now)
  // Note: setPlatform will be used when LinkedIn support is added in future stories
  const [platform] = useState<string>("twitter");

  // Modal state
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<Id<"posts"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit state
  const [editPostId, setEditPostId] = useState<Id<"posts"> | null>(null);
  const [success, setSuccess] = useState(false);

  // Mutations
  const deletePost = useMutation(api.posts.deletePost);

  // Calculate date range timestamps
  const { startDate, endDate } = useMemo(() => {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    if (dateRange === "all") {
      return { startDate: undefined, endDate: undefined };
    }

    const days = dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : 90;
    return {
      startDate: now - days * DAY_MS,
      endDate: now,
    };
  }, [dateRange]);

  // Query posts with filters
  const posts = useQuery(api.posts.getPosts, {
    startDate,
    endDate,
    platform,
  });

  // Find selected post for modal
  const selectedPost = posts?.find((p) => p._id === selectedPostId);

  // Find post to edit
  const editPost = posts?.find((p) => p._id === editPostId);

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;

    setIsDeleting(true);
    try {
      await deletePost({ postId: deleteConfirmId });
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Failed to delete post:", error);
      alert(`Failed to delete post: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handle edit button click
   */
  const handleEditClick = (postId: Id<"posts">, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent modal from opening
    setEditPostId(postId);
  };

  /**
   * Handle delete button click
   */
  const handleDeleteClick = (postId: Id<"posts">, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent modal from opening
    setDeleteConfirmId(postId);
  };

  /**
   * Render status badge with appropriate styling
   */
  const StatusBadge = ({ status }: { status: string }) => {
    const variants: Record<string, { label: string; className: string }> = {
      Scheduled: { label: "Scheduled", className: "bg-blue-500 hover:bg-blue-600" },
      Publishing: { label: "Publishing", className: "bg-yellow-500 hover:bg-yellow-600" },
      Published: { label: "Published", className: "bg-green-500 hover:bg-green-600" },
      Failed: { label: "Failed", className: "bg-red-500 hover:bg-red-600" },
    };

    const variant = variants[status] || { label: status, className: "bg-gray-500" };

    return (
      <Badge className={`${variant.className} text-white`}>
        {variant.label}
      </Badge>
    );
  };

  /**
   * Format timestamp to readable date/time
   */
  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * Truncate content preview
   */
  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  // Loading state
  if (posts === undefined) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Post History</CardTitle>
            <CardDescription>Loading your posts...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-md" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state
  if (posts.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Post History</CardTitle>
            <CardDescription>View your scheduled and published posts</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Date Range Filter */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "7days", label: "Last 7 Days" },
                  { value: "30days", label: "Last 30 Days" },
                  { value: "90days", label: "Last 90 Days" },
                  { value: "all", label: "All Time" },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant={dateRange === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRange(option.value as DateRangeOption)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Empty State */}
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                No posts found for the selected date range.
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Try selecting a different date range or schedule your first post!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Posts list
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Post History</CardTitle>
          <CardDescription>
            View your scheduled and published posts (X/Twitter)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Date Range Filter */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {[
                { value: "7days", label: "Last 7 Days" },
                { value: "30days", label: "Last 30 Days" },
                { value: "90days", label: "Last 90 Days" },
                { value: "all", label: "All Time" },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={dateRange === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateRange(option.value as DateRangeOption)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Platform Filter (X/Twitter only for now) */}
          <div className="mb-6">
            <div className="flex gap-2">
              <Button variant="default" size="sm">
                X/Twitter
              </Button>
              <Button variant="outline" size="sm" disabled>
                LinkedIn (Coming Soon)
              </Button>
            </div>
          </div>

          {/* Posts List */}
          <div className="space-y-4">
            {posts.map((post) => (
              <Card
                key={post._id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedPostId(post._id)}
              >
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <StatusBadge status={post.status} />
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(post.twitterScheduledTime || 0)}
                    </span>
                  </div>
                  <p className="text-sm mb-2">
                    {truncateContent(post.twitterContent || "")}
                  </p>
                  {post.url && (
                    <p className="text-xs text-blue-500 truncate">
                      {post.url}
                    </p>
                  )}
                  {post.status === "Failed" && post.errorMessage && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-xs text-red-600 font-medium">
                        Error: {post.errorMessage}
                      </p>
                    </div>
                  )}

                  {/* Edit/Delete Actions - Only show for Scheduled posts */}
                  {post.status === "Scheduled" && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleEditClick(post._id, e)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => handleDeleteClick(post._id, e)}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Post Details Modal */}
      <Dialog open={!!selectedPostId} onOpenChange={() => setSelectedPostId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
            <DialogDescription>
              Full details for this scheduled post
            </DialogDescription>
          </DialogHeader>

          {selectedPost && (
            <div className="space-y-4">
              {/* Status */}
              <div>
                <h4 className="text-sm font-medium mb-2">Status</h4>
                <StatusBadge status={selectedPost.status} />
              </div>

              {/* Scheduled Time */}
              <div>
                <h4 className="text-sm font-medium mb-2">Scheduled Time</h4>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(selectedPost.twitterScheduledTime || 0)}
                </p>
              </div>

              {/* Content */}
              <div>
                <h4 className="text-sm font-medium mb-2">Content</h4>
                <p className="text-sm whitespace-pre-wrap">
                  {selectedPost.twitterContent}
                </p>
              </div>

              {/* URL */}
              {selectedPost.url && (
                <div>
                  <h4 className="text-sm font-medium mb-2">URL</h4>
                  <a
                    href={selectedPost.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline break-all"
                  >
                    {selectedPost.url}
                  </a>
                </div>
              )}

              {/* Published Post Link */}
              {selectedPost.status === "Published" && selectedPost.twitterPostId && (
                <div>
                  <h4 className="text-sm font-medium mb-2">View on X/Twitter</h4>
                  <a
                    href={`https://x.com/i/web/status/${selectedPost.twitterPostId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline"
                  >
                    Open Post on X
                  </a>
                </div>
              )}

              {/* Error Details */}
              {selectedPost.status === "Failed" && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-red-600">Error Details</h4>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600 mb-1">
                      <span className="font-medium">Error:</span> {selectedPost.errorMessage || "Unknown error"}
                    </p>
                    <p className="text-sm text-red-600">
                      <span className="font-medium">Retry Count:</span> {selectedPost.retryCount || 0}/3
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Post Modal */}
      <Dialog open={!!editPostId} onOpenChange={() => setEditPostId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {editPost && (
            <PostScheduler
              mode="edit"
              postData={{
                _id: editPost._id,
                twitterContent: editPost.twitterContent,
                linkedInContent: editPost.linkedInContent,
                twitterScheduledTime: editPost.twitterScheduledTime,
                linkedInScheduledTime: editPost.linkedInScheduledTime,
                url: editPost.url,
              }}
              onSuccess={() => {
                setEditPostId(null);
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
