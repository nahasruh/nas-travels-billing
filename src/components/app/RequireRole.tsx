import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  if (loading) {
    return (
      <div className="min-h-[40vh] grid place-items-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  // This is the most common reason admin pages look “blank”:
  // user exists in Auth, but no row in public.profiles.
  if (!role) {
    return (
      <Card className="border-border/60 bg-card/70 backdrop-blur">
        <div className="p-5 space-y-3">
          <div className="text-lg font-semibold tracking-tight">Role not assigned</div>
          <div className="text-sm text-muted-foreground leading-relaxed">
            Your login is working, but this user has no role in <span className="mono">public.profiles</span>.
            Add a row for your user and set <b>admin</b> or <b>salesman</b>, then sign out and sign in again.
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 p-3 mono text-xs overflow-auto">
            insert into public.profiles (user_id, role)
            values ('YOUR_AUTH_USER_UUID', 'admin')
            on conflict (user_id) do update set role = 'admin';
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setLocation("/")}>Go to Dashboard</Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!allow.includes(role)) return null;
  return <>{children}</>;
}
