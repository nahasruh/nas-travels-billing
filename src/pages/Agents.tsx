import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, RefreshCcw } from "lucide-react";
import { formatSar } from "@/lib/format";

type Agent = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  opening_balance_sar: number;
};

type AgentBalance = {
  agent_id: string;
  agent_name: string;
  opening_balance_sar: number;
  total_cost_sar: number;
  total_paid_out_sar: number;
  balance_sar: number;
};

function AgentForm({
  initial,
  onSave,
}: {
  initial?: Partial<Agent>;
  onSave: (values: Partial<Agent>) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [opening, setOpening] = useState(String(initial?.opening_balance_sar ?? 0));
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name" />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" />
        </div>
        <div className="space-y-2">
          <Label>Opening balance (SAR)</Label>
          <Input value={opening} onChange={(e) => setOpening(e.target.value)} inputMode="decimal" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
      </div>

      <Button
        className="w-full"
        disabled={busy}
        onClick={async () => {
          if (!name.trim()) return toast.error("Name is required");
          try {
            setBusy(true);
            await onSave({
              name: name.trim(),
              phone: phone.trim() || null,
              email: email.trim() || null,
              opening_balance_sar: Number(opening || 0),
              notes: notes.trim() || null,
            });
          } catch (e: any) {
            toast.error(e?.message ?? "Save failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

export default function Agents() {
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [balances, setBalances] = useState<Record<string, AgentBalance>>({});
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const { data: a, error: e1 } = await supabase
      .from("agents")
      .select("id,name,phone,email,notes,opening_balance_sar")
      .order("name", { ascending: true });

    const { data: b, error: e2 } = await supabase.from("v_agent_balances").select("*");

    if (e1) toast.error(e1.message);
    if (e2) toast.error(e2.message);

    setAgents((a ?? []) as Agent[]);
    const map: Record<string, AgentBalance> = {};
    (b ?? []).forEach((row: any) => {
      map[row.agent_id] = row as AgentBalance;
    });
    setBalances(map);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return agents;
    return agents.filter((a) => a.name.toLowerCase().includes(s) || (a.phone ?? "").includes(s));
  }, [agents, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Agents</div>
          <div className="text-sm text-muted-foreground">Suppliers you buy flight tickets from</div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            className="w-full sm:w-[280px]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or phone"
          />
          <Button variant="outline" className="gap-2" onClick={load}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[680px]">
              <DialogHeader>
                <DialogTitle>New agent</DialogTitle>
              </DialogHeader>
              <AgentForm
                onSave={async (values) => {
                  const { error } = await supabase.from("agents").insert(values);
                  if (error) throw error;
                  toast.success("Agent created");
                  await load();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-border/60 bg-card/70 backdrop-blur">
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="text-right">Balance (SAR)</TableHead>
                <TableHead className="w-[140px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => {
                const bal = balances[a.id];
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground">Opening: {formatSar(a.opening_balance_sar)}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{a.phone ?? "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{a.email ?? "—"}</TableCell>
                    <TableCell className="text-right mono">{formatSar(bal?.balance_sar ?? a.opening_balance_sar)}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="icon" variant="outline">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[680px]">
                            <DialogHeader>
                              <DialogTitle>Edit agent</DialogTitle>
                            </DialogHeader>
                            <AgentForm
                              initial={a}
                              onSave={async (values) => {
                                const { error } = await supabase.from("agents").update(values).eq("id", a.id);
                                if (error) throw error;
                                toast.success("Agent updated");
                                await load();
                              }}
                            />
                          </DialogContent>
                        </Dialog>

                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={async () => {
                            if (!confirm(`Delete agent "${a.name}"?`)) return;
                            const { error } = await supabase.from("agents").delete().eq("id", a.id);
                            if (error) return toast.error(error.message);
                            toast.success("Deleted");
                            await load();
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No agents yet.
                  </TableCell>
                </TableRow>
              )}

              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
