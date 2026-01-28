import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ShieldX } from "lucide-react";
import { Layout } from "@/components/layout/Layout";

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-12 flex justify-center items-center min-h-[50vh]">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-brand-600 mx-auto mb-3" />
            <p className="text-ink-500">Checking authorization...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container py-12 flex justify-center items-center min-h-[50vh]">
          <div className="text-center max-w-md">
            <ShieldX size={48} className="text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-ink-900 mb-2">Not Authorized</h1>
            <p className="text-ink-500 mb-6">
              You don't have permission to access the admin panel. Please contact an administrator if you believe this is an error.
            </p>
            <p className="text-sm text-ink-400">
              Logged in as: {user.email}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return <>{children}</>;
}
