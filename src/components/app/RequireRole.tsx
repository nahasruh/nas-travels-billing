import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/contexts/AuthContext";

export default function RequireRole({
  allow,
  children,
}: {
  allow: AppRole[];
  children: React.ReactNode;
}) {
  const { role, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && role && !allow.includes(role)) {
      toast.error("Access denied");
      setLocation("/");
    }
  }, [loading, role, allow, setLocation]);

  if (loading) return null;
  if (!role) return null;
  if (!allow.includes(role)) return null;
  return <>{children}</>;
}
