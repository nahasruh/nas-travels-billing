import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, RefreshCcw } from "lucide-react";
import { format } from "date-fns";
import { formatSar } from "@/lib/format";

type Agent = { id: string; name: string };

type SaleLite = { id: string; customer_name: string; ticket_number: string | null; sale_date: string };

type LedgerRow = {
  id: string;
  entry_date: string;
  direction: "customer_in" | "agent_out" | "agent_credit";
  method: "cash" | "bank_transfer" | "card" | "credit";
  sale_id: string | null;
  agent_id: string | null;
  amount_sar: number;
  reference: string | null;
  notes: string | null;
};

const directionLabels: Record<LedgerRow["direction"], string> = {
  customer_in: "Customer received",
  agent_out: "Paid to agent",
  agent_credit: "Agent credit",
};

function LedgerForm({
  agents,
  sales,
  onCreated,
  isAdmin,
}: {
  agents: Agent[];
  sales: SaleLite[];
  onCreated: () => Promise<void>;
  isAdmin: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [direction, setDirection] = useState<LedgerRow["direction"]>("customer_in");
  const [method, setMethod] = useState<LedgerRow["method"]>("cash");
  const [amount, setAmount] = useState("0");
  const [agentId, setAgentId] = useState<string | undefined>(undefined);
  const [saleId, setSaleId] = useState<string | undefined>(undefined);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Amount (SAR)</Label>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
        </div>
        <div className="space-y-2">
          <Label>Direction</Label>
          <Select value={direction} onValueChange={(v) => setDirection(v as any)} disabled={!isAdmin}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer_in">Customer received</SelectItem>
              {isAdmin && <SelectItem value="agent_out">Paid to agent</SelectItem>}
              {isAdmin && <SelectItem value="agent_credit">Agent credit</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Method</Label>
          <Select value={method} onValueChange={(v) => setMethod(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank_transfer">Bank transfer</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Agent (optional)</Label>
          <Select value={agentId} onValueChange={setAgentId} disabled={!isAdmin}>
            <SelectTrigger>
              <SelectValue placeholder="Select agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">
            Use for agent payments or agent credit adjustments.
          </div>
        </div>
        <div className="space-y-2">
          <Label>Sale (optional)</Label>
          <Select value={saleId} onValueChange={setSaleId}>
            <SelectTrigger>
              <SelectValue placeholder="Link to a sale" />
            </SelectTrigger>
            <SelectContent>
              {sales.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.sale_date} • {s.customer_name}{s.ticket_number ? ` • ${s.ticket_number}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">Optional reference for reporting.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Reference</Label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bank reference / receipt" />
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      <Button
        className="w-full"
        disabled={busy}
        onClick={async () => {
          const amt = Number(amount || 0);
          if (!amt || amt <= 0) return toast.error("Amount must be > 0");
          if (direction !== "customer_in" && !agentId) {
            return toast.error("Select an agent for agent payments/credits");
          }
          try {
            setBusy(true);
            const payload = {
              entry_date: entryDate,
              direction,
              method,
              amount_sar: amt,
              agent_id: agentId ?? null,
              sale_id: saleId ?? null,
              reference: reference.trim() || null,
              notes: notes.trim() || null,
            };
            const { error } = await supabase.from("ledger_entries").insert(payload);
            if (error) throw error;
            toast.success("Saved");
            await onCreated();
          } catch (e: any) {
            toast.error(e?.message ?? "Failed");
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

export default function Payments() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sales, setSales] = useState<SaleLite[]>([]);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);

    const [{ data: a }, { data: s }, { data: l, error: e3 }] = await Promise.all([
      supabase.from("agents").select("id,name").order("name"),
      supabase.from("sales").select("id,customer_name,ticket_number,sale_date").order("sale_date", { ascending: false }).limit(200),
      supabase
        .from("ledger_entries")
        .select("id,entry_date,direction,method,sale_id,agent_id,amount_sar,reference,notes")
        .order("entry_date", { ascending: false })
        .limit(500),
    ]);

    if (e3) toast.error(e3.message);

    setAgents((a ?? []) as Agent[]);
    setSales((s ?? []) as SaleLite[]);
    setRows((l ?? []) as LedgerRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const agentName = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a.name])), [agents]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const agent = r.agent_id ? agentName[r.agent_id]?.toLowerCase() ?? "" : "";
      return (
        r.direction.toLowerCase().includes(s) ||
        r.method.toLowerCase().includes(s) ||
        agent.includes(s) ||
        (r.reference ?? "").toLowerCase().includes(s)
      );
    });
  }, [rows, q, agentName]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Payments / Ledger</div>
          <div className="text-sm text-muted-foreground">Track customer receipts + agent payments</div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            className="w-full sm:w-[320px]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search: method / direction / agent"
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
            <DialogContent className="sm:max-w-[900px]">
              <DialogHeader>
                <DialogTitle>New ledger entry</DialogTitle>
              </DialogHeader>
              <LedgerForm agents={agents} sales={sales} onCreated={load} isAdmin={isAdmin} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-border/60 bg-card/70 backdrop-blur">
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Method</TableHead>
                <TableHead className="hidden lg:table-cell">Agent</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden lg:table-cell">Reference</TableHead>
                <TableHead className="w-[90px] text-right"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const sign = r.direction === "customer_in" ? 1 : -1;
                const amount = sign * r.amount_sar;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="mono">{r.entry_date}</TableCell>
                    <TableCell>{directionLabels[r.direction]}</TableCell>
                    <TableCell className="hidden md:table-cell">{r.method.replaceAll("_", " ")}</TableCell>
                    <TableCell className="hidden lg:table-cell">{r.agent_id ? agentName[r.agent_id] : "—"}</TableCell>
                    <TableCell className={"text-right mono " + (amount >= 0 ? "text-primary" : "text-muted-foreground")}>
                      {formatSar(amount)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{r.reference ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {isAdmin ? (
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={async () => {
                            if (!confirm("Delete this entry?") ) return;
                            const { error } = await supabase.from("ledger_entries").delete().eq("id", r.id);
                            if (error) return toast.error(error.message);
                            toast.success("Deleted");
                            await load();
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">No delete</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No entries yet.
                  </TableCell>
                </TableRow>
              )}

              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground">
        Note: Totals on the Dashboard include all ledger entries.
      </div>
    </div>
  );
}
