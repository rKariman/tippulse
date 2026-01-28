import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ShieldX } from "lucide-react";
import { Layout } from "@/components/layout/Layout";

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isAdmin, isLoading, checkAdminStatus } = useAuth();
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);

  // Only check admin status when this guard mounts (on admin routes)
  useEffect(() => {
    if (!isLoading && user && isAdmin === null && !isCheckingAdmin) {
      setIsCheckingAdmin(true);
      console.log("[AdminGuard] Triggering admin check...");
      checkAdminStatus().finally(() => {
        setIsCheckingAdmin(false);
        setAdminCheckComplete(true);
      });
    } else if (!isLoading && !user) {
      setAdminCheckComplete(true);
    } else if (isAdmin !== null) {
      setAdminCheckComplete(true);
    }
  }, [isLoading, user, isAdmin, checkAdminStatus, isCheckingAdmin]);

  // Show loading while checking auth or admin status
  if (isLoading || (user && isAdmin === null && !adminCheckComplete)) {
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

  // Redirect to login if not authenticated
  if (!user) {
    console.log("[AdminGuard] No user, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // Show not authorized if admin check complete and not admin
  if (adminCheckComplete && isAdmin === false) {
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
