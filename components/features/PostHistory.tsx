"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
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
import { IconCopy } from "@tabler/icons-react";
import { Id } from "@/convex/_generated/dataModel";
import { PostScheduler } from "./PostScheduler";

// Post type definition
type Post = {
  _id: Id<"posts">;
  status: string;
  twitterContent?: string;
  twitterScheduledTime?: number;
  twitterPostId?: string;
  linkedInContent?: string;
  linkedInScheduledTime?: number;
  linkedInPostId?: string;
  url?: string | null;
  errorMessage?: string | null;
  retryCount?: number;
};

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
  // Router for navigation
  const router = useRouter();

  // Date range state
  type DateRangeOption = "7days" | "30days" | "90days" | "all";
  const [dateRange, setDateRange] = useState<DateRangeOption>("30days");

  // Platform filter state
  type PlatformOption = "all" | "twitter" | "linkedin";
  const [platform, setPlatform] = useState<PlatformOption>("all");

  // Modal state
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<Id<"posts"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit state
  const [editPostId, setEditPostId] = useState<Id<"posts"> | null>(null);

  // Clone state
  const [cloningPostId, setCloningPostId] = useState<Id<"posts"> | null>(null);

  // Mutations
  const deletePost = useMutation(api.posts.deletePost);
  const clonePost = useMutation(api.posts.clonePost);

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
   * Handle clone button click
   */
  const handleClone = async (postId: Id<"posts">, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent modal from opening

    setCloningPostId(postId);
    try {
      // Call clonePost mutation and get new post ID
      const newPostId = await clonePost({ postId });

      // Navigate to PostScheduler with new draft post pre-loaded
      router.push(`/schedule?postId=${newPostId}`);
    } catch (error) {
      console.error("Failed to clone post:", error);
      alert(`Failed to clone post: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setCloningPostId(null);
    }
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
   * Get platform-specific status for a post
   */
  const getPlatformStatus = (
    post: Post,
    platformType: "twitter" | "linkedin"
  ): string => {
    const postId = platformType === "twitter" ? post.twitterPostId : post.linkedInPostId;
    const scheduledTime =
      platformType === "twitter"
        ? post.twitterScheduledTime
        : post.linkedInScheduledTime;

    if (!scheduledTime) return "N/A";

    // If post ID exists, it's published
    if (postId) return "Published";

    // Check if scheduled time has passed
    const now = Date.now();
    if (scheduledTime < now) {
      // Check for error message to determine if failed
      if (post.errorMessage) return "Failed";
      // If time passed but no post ID, might be publishing or failed
      return post.status === "Failed" ? "Failed" : "Publishing";
    }

    // Future time = Scheduled
    return "Scheduled";
  };

  /**
   * Render platform-specific status badges for dual-platform posts
   */
  const PlatformStatusBadges = ({ post }: { post: Post }) => {
    const hasTwitter = post.twitterScheduledTime !== undefined;
    const hasLinkedIn = post.linkedInScheduledTime !== undefined;

    // If only one platform, show standard status badge
    if (!hasTwitter || !hasLinkedIn) {
      return <StatusBadge status={post.status} />;
    }

    // Dual platform - show separate badges
    const twitterStatus = getPlatformStatus(post, "twitter");
    const linkedInStatus = getPlatformStatus(post, "linkedin");

    const getStatusColor = (status: string) => {
      const colors: Record<string, string> = {
        Scheduled: "bg-blue-500 hover:bg-blue-600",
        Publishing: "bg-yellow-500 hover:bg-yellow-600",
        Published: "bg-green-500 hover:bg-green-600",
        Failed: "bg-red-500 hover:bg-red-600",
      };
      return colors[status] || "bg-gray-500";
    };

    return (
      <div className="flex gap-2 flex-wrap">
        {hasTwitter && (
          <Badge className={`${getStatusColor(twitterStatus)} text-white text-xs`}>
            X: {twitterStatus}
          </Badge>
        )}
        {hasLinkedIn && (
          <Badge className={`${getStatusColor(linkedInStatus)} text-white text-xs`}>
            LinkedIn: {linkedInStatus}
          </Badge>
        )}
      </div>
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

            {/* Platform Filter */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={platform === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPlatform("all")}
                >
                  All Platforms
                </Button>
                <Button
                  variant={platform === "twitter" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPlatform("twitter")}
                >
                  X/Twitter
                </Button>
                <Button
                  variant={platform === "linkedin" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPlatform("linkedin")}
                >
                  LinkedIn
                </Button>
              </div>
            </div>

            {/* Empty State */}
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                No posts found for the selected filters.
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Try selecting different date range or platform filters, or schedule your first post!
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
            View your scheduled and published posts
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

          {/* Platform Filter */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={platform === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setPlatform("all")}
              >
                All Platforms
              </Button>
              <Button
                variant={platform === "twitter" ? "default" : "outline"}
                size="sm"
                onClick={() => setPlatform("twitter")}
              >
                X/Twitter
              </Button>
              <Button
                variant={platform === "linkedin" ? "default" : "outline"}
                size="sm"
                onClick={() => setPlatform("linkedin")}
              >
                LinkedIn
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
                    <div className="flex gap-2 flex-wrap items-center">
                      <PlatformStatusBadges post={post} />
                      {/* Platform Badges */}
                      <div className="flex gap-1">
                        {post.twitterScheduledTime && (
                          <Badge className="bg-blue-500 text-white">X</Badge>
                        )}
                        {post.linkedInScheduledTime && (
                          <Badge className="bg-[#0A66C2] text-white">LinkedIn</Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(
                        platform === "linkedin"
                          ? post.linkedInScheduledTime || 0
                          : platform === "twitter"
                            ? post.twitterScheduledTime || 0
                            : Math.min(
                                post.twitterScheduledTime || Infinity,
                                post.linkedInScheduledTime || Infinity
                              ) === Infinity
                              ? 0
                              : Math.min(
                                  post.twitterScheduledTime || Infinity,
                                  post.linkedInScheduledTime || Infinity
                                )
                      )}
                    </span>
                  </div>
                  <p className="text-sm mb-2">
                    {truncateContent(
                      platform === "linkedin"
                        ? post.linkedInContent || ""
                        : platform === "twitter"
                          ? post.twitterContent || ""
                          : (post.twitterScheduledTime || Infinity) <
                              (post.linkedInScheduledTime || Infinity)
                            ? post.twitterContent || ""
                            : post.linkedInContent || ""
                    )}
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

                  {/* Clone Action - Only show for Published or Failed posts */}
                  {(post.status === "Published" || post.status === "Failed") && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => handleClone(post._id, e)}
                        disabled={cloningPostId === post._id}
                        aria-label="Clone this post"
                      >
                        <IconCopy className="w-4 h-4 mr-2" />
                        {cloningPostId === post._id ? "Cloning..." : "Clone"}
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
                <PlatformStatusBadges post={selectedPost} />
              </div>

              {/* Twitter Section */}
              {selectedPost.twitterScheduledTime && (
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                    <Badge className="bg-blue-500 text-white">X</Badge>
                    X/Twitter Post
                  </h3>

                  {/* Twitter Scheduled Time */}
                  <div className="mb-3">
                    <h4 className="text-sm font-medium mb-2">Scheduled Time</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(selectedPost.twitterScheduledTime)}
                    </p>
                  </div>

                  {/* Twitter Content */}
                  <div className="mb-3">
                    <h4 className="text-sm font-medium mb-2">Content</h4>
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedPost.twitterContent}
                    </p>
                  </div>

                  {/* Twitter Post Link */}
                  {selectedPost.twitterPostId && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">View Post</h4>
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
                </div>
              )}

              {/* LinkedIn Section */}
              {selectedPost.linkedInScheduledTime && (
                <div className="border-l-4 border-[#0A66C2] pl-4">
                  <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                    <Badge className="bg-[#0A66C2] text-white">LinkedIn</Badge>
                    LinkedIn Post
                  </h3>

                  {/* LinkedIn Scheduled Time */}
                  <div className="mb-3">
                    <h4 className="text-sm font-medium mb-2">Scheduled Time</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(selectedPost.linkedInScheduledTime)}
                    </p>
                  </div>

                  {/* LinkedIn Content */}
                  <div className="mb-3">
                    <h4 className="text-sm font-medium mb-2">Content</h4>
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedPost.linkedInContent}
                    </p>
                  </div>

                  {/* LinkedIn Post Link */}
                  {selectedPost.linkedInPostId && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">View Post</h4>
                      <a
                        href={`https://www.linkedin.com/feed/update/${selectedPost.linkedInPostId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline"
                      >
                        Open Post on LinkedIn
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* URL for auto-commenting */}
              {selectedPost.url && (
                <div>
                  <h4 className="text-sm font-medium mb-2">URL for Auto-Comment</h4>
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
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
