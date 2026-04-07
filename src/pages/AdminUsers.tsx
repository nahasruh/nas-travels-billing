import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminUsers() {
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  const endpoint = useMemo(() => {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    return url ? `${url}/functions/v1/create-salesman` : "";
  }, []);

  async function create() {
    if (!endpoint) return toast.error("Missing VITE_SUPABASE_URL");
    if (!session?.access_token) return toast.error("No session token");
    if (!email.trim()) return toast.error("Email required");
    if (!password || password.length < 6) return toast.error("Password must be at least 6 characters");

    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: email.trim(), password, full_name: fullName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed");

      toast.success(`Salesman created: ${data.email}`);
      setEmail("");
      setPassword("");
      setFullName("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold tracking-tight">Create Salesman Login</div>
        <div className="text-sm text-muted-foreground">
          This creates a Supabase Auth user and assigns role = salesman.
        </div>
      </div>

      <Card className="border-border/60 bg-card/70 backdrop-blur">
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Email (username)</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@nas.com" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 chars" />
            </div>
            <div className="space-y-2">
              <Label> </Label>
              <Button className="w-full" disabled={busy} onClick={create}>
                {busy ? "Creating…" : "Create salesman"}
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground leading-relaxed">
            If you see “Missing function secrets” or “Admin role required”, deploy the Edge Function and
            ensure your user has role = admin in <span className="mono">profiles</span>.
          </div>
        </div>
      </Card>
    </div>
  );
}
