import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const { signInWithPassword } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="min-h-screen grid place-items-center p-6 grid-fade">
      <Card className="w-full max-w-md border-border/60 bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/55">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xl font-semibold tracking-tight">NAS Travels</div>
              <div className="text-sm text-muted-foreground">Billing Application • Sign in</div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-primary text-primary-foreground grid place-items-center font-bold">N</div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <Button
              className="w-full"
              disabled={busy}
              onClick={async () => {
                try {
                  setBusy(true);
                  await signInWithPassword(email.trim(), password);
                  toast.success("Signed in");
                  setLocation("/");
                } catch (e: any) {
                  toast.error(e?.message ?? "Sign in failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>

            <div className="text-xs text-muted-foreground">
              Admin note: create users in Supabase → Authentication → Users.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
