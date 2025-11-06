import { AuthGuard } from "@/components/AuthGuard";

/**
 * Layout for all protected routes
 * Wraps children with AuthGuard to ensure authentication
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
