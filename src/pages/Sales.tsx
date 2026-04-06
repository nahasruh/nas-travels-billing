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
type Salesman = { id: string; name: string };

type Sale = {
  id: string;
  sale_date: string;
  customer_name: string;
  customer_mobile: string | null;
  ticket_number: string | null;
  route: string | null;
  passenger_name: string | null;
  agent_id: string | null;
  salesman_id: string | null;
  sell_amount_sar: number;
  cost_amount_sar: number;
  profit_sar: number;
  notes: string | null;
};

function SaleForm({ agents, salesmen, onCreated }: { agents: Agent[]; salesmen: Salesman[]; onCreated: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [saleDate, setSaleDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [route, setRoute] = useState("");
  const [passengerName, setPassengerName] = useState("");
  const [agentId, setAgentId] = useState<string | undefined>(undefined);
  const [salesmanId, setSalesmanId] = useState<string | undefined>(undefined);
  const [sellAmount, setSellAmount] = useState("0");
  const [costAmount, setCostAmount] = useState("0");
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Sale date</Label>
          <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Ticket number</Label>
          <Input value={ticketNumber} onChange={(e) => setTicketNumber(e.target.value)} placeholder="Optional" />
        </div>
        <div className="space-y-2">
          <Label>Customer name *</Label>
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer" />
        </div>
        <div className="space-y-2">
          <Label>Customer mobile</Label>
          <Input value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} placeholder="Optional" />
        </div>
        <div className="space-y-2">
          <Label>Passenger name</Label>
          <Input value={passengerName} onChange={(e) => setPassengerName(e.target.value)} placeholder="Optional" />
        </div>
        <div className="space-y-2">
          <Label>Route</Label>
          <Input value={route} onChange={(e) => setRoute(e.target.value)} placeholder="RUH-JED (optional)" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Agent (supplier)</Label>
          <Select value={agentId} onValueChange={setAgentId}>
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
        </div>
        <div className="space-y-2">
          <Label>Salesman</Label>
          <Select value={salesmanId} onValueChange={setSalesmanId}>
            <SelectTrigger>
              <SelectValue placeholder="Select salesman" />
            </SelectTrigger>
            <SelectContent>
              {salesmen.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Sell amount (SAR)</Label>
          <Input value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} inputMode="decimal" />
        </div>
        <div className="space-y-2">
          <Label>Cost amount (SAR)</Label>
          <Input value={costAmount} onChange={(e) => setCostAmount(e.target.value)} inputMode="decimal" />
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
          if (!customerName.trim()) return toast.error("Customer name is required");
          try {
            setBusy(true);
            const payload = {
              sale_date: saleDate,
              customer_name: customerName.trim(),
              customer_mobile: customerMobile.trim() || null,
              ticket_number: ticketNumber.trim() || null,
              route: route.trim() || null,
              passenger_name: passengerName.trim() || null,
              agent_id: agentId ?? null,
              salesman_id: salesmanId ?? null,
              sell_amount_sar: Number(sellAmount || 0),
              cost_amount_sar: Number(costAmount || 0),
              notes: notes.trim() || null,
            };
            const { error } = await supabase.from("sales").insert(payload);
            if (error) throw error;
            toast.success("Sale added");
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

export default function Sales() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [rows, setRows] = useState<Sale[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);

    const [{ data: a }, { data: s }, { data: sales, error: e3 }] = await Promise.all([
      supabase.from("agents").select("id,name").order("name"),
      supabase.from("salesmen").select("id,name").eq("active", true).order("name"),
      supabase
        .from("sales")
        .select(
          "id,sale_date,customer_name,customer_mobile,ticket_number,route,passenger_name,agent_id,salesman_id,sell_amount_sar,cost_amount_sar,profit_sar,notes"
        )
        .order("sale_date", { ascending: false })
        .limit(500),
    ]);

    if (e3) toast.error(e3.message);

    setAgents((a ?? []) as Agent[]);
    setSalesmen((s ?? []) as Salesman[]);
    setRows((sales ?? []) as Sale[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      return (
        r.customer_name.toLowerCase().includes(s) ||
        (r.customer_mobile ?? "").includes(s) ||
        (r.ticket_number ?? "").toLowerCase().includes(s)
      );
    });
  }, [rows, q]);

  const agentName = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a.name])), [agents]);
  const salesmanName = useMemo(() => Object.fromEntries(salesmen.map((s) => [s.id, s.name])), [salesmen]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Sales (Tickets)</div>
          <div className="text-sm text-muted-foreground">Track each ticket and profit</div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            className="w-full sm:w-[320px]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search: customer / ticket / mobile"
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
            <DialogContent className="sm:max-w-[820px]">
              <DialogHeader>
                <DialogTitle>New sale</DialogTitle>
              </DialogHeader>
              <SaleForm agents={agents} salesmen={salesmen} onCreated={load} />
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
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Ticket</TableHead>
                <TableHead className="hidden lg:table-cell">Agent</TableHead>
                <TableHead className="hidden lg:table-cell">Salesman</TableHead>
                <TableHead className="text-right">Sell</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                {isAdmin && <TableHead className="text-right">Profit</TableHead>}
                <TableHead className="w-[90px] text-right"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="mono">{r.sale_date}</TableCell>
                  <TableCell>
                    <div className="font-medium">{r.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{r.customer_mobile ?? "—"}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{r.ticket_number ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{r.agent_id ? agentName[r.agent_id] : "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{r.salesman_id ? salesmanName[r.salesman_id] : "—"}</TableCell>
                  <TableCell className="text-right mono">{formatSar(r.sell_amount_sar)}</TableCell>
                  <TableCell className="text-right mono">{formatSar(r.cost_amount_sar)}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right mono text-primary">{formatSar(r.profit_sar)}</TableCell>
                  )}
                  <TableCell className="text-right">
                    {isAdmin ? (
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={async () => {
                          if (!confirm("Delete this sale?") ) return;
                          const { error } = await supabase.from("sales").delete().eq("id", r.id);
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
              ))}

              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 9 : 8}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No sales yet.
                  </TableCell>
                </TableRow>
              )}

              {loading && (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 9 : 8}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground">
        Tip: Use the Search page for a wider lookup.
      </div>
    </div>
  );
}
