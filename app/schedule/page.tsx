import { PostScheduler } from "@/components/features/PostScheduler";

export default function SchedulePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Schedule Post</h1>
        <p className="text-muted-foreground mt-2">
          Create and schedule content for X/Twitter
        </p>
      </div>
      <PostScheduler />
    </div>
  );
}
