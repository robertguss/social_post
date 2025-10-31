import { PostHistory } from "@/components/features/PostHistory";

export const metadata = {
  title: "Post History | Social Post Scheduler",
  description: "View your scheduled and published social media posts",
};

/**
 * Post History Page
 *
 * Displays a list of user's scheduled and published posts with filtering options.
 * Protected by Clerk middleware (configured in middleware.ts).
 */
export default function HistoryPage() {
  return (
    <main className="min-h-screen py-8">
      <PostHistory />
    </main>
  );
}
