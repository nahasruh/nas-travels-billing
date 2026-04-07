import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";
import { FileDown, Receipt, Ticket } from "lucide-react";

export default function Reports() {
  const { session } = useAuth();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState(false);
  const [sheetBusy, setSheetBusy] = useState(false);

  async function fetchSheet(tab: string) {
    const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!base) throw new Error("Missing VITE_SUPABASE_URL");
    if (!session?.access_token) throw new Error("No session");

    const url = `${base}/functions/v1/sheets-read?tab=${encodeURIComponent(tab)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "Failed");
    return data as { tab: string; headers: string[]; rows: Record<string, any>[] };
  }

  async function exportSales() {
    setBusy(true);

    const [{ data: agents }, { data: salesmen }] = await Promise.all([
      supabase.from("agents").select("id,name"),
      supabase.from("salesmen").select("id,name"),
    ]);

    const agentName = new Map<string, string>((agents ?? []).map((a: any) => [a.id, a.name]));
    const salesmanName = new Map<string, string>((salesmen ?? []).map((s: any) => [s.id, s.name]));

    const query = supabase
      .from("sales")
      .select(
        "id,sale_date,customer_name,customer_mobile,ticket_number,route,passenger_name,agent_id,salesman_id,sell_amount_sar,cost_amount_sar,profit_sar,notes,created_at"
      )
      .order("sale_date", { ascending: false })
      .limit(5000);

    const q = from ? query.gte("sale_date", from).lte("sale_date", to) : query.lte("sale_date", to);
    const { data, error } = await q;
    setBusy(false);
    if (error) return toast.error(error.message);

    downloadCsv(
      `nas-sales-${from || "start"}-to-${to}.csv`,
      (data ?? []).map((r: any) => ({
        sale_date: r.sale_date,
        customer_name: r.customer_name,
        customer_mobile: r.customer_mobile,
        ticket_number: r.ticket_number,
        route: r.route,
        passenger_name: r.passenger_name,
        agent_name: r.agent_id ? agentName.get(r.agent_id) ?? "" : "",
        salesman_name: r.salesman_id ? salesmanName.get(r.salesman_id) ?? "" : "",
        sell_amount_sar: r.sell_amount_sar,
        cost_amount_sar: r.cost_amount_sar,
        profit_sar: r.profit_sar,
        notes: r.notes,
      }))
    );
    toast.success(`Exported ${data?.length ?? 0} sales`);
  }

  async function exportLedger() {
    setBusy(true);

    const [{ data: agents }, { data: sales }] = await Promise.all([
      supabase.from("agents").select("id,name"),
      supabase.from("sales").select("id,customer_name,ticket_number"),
    ]);

    const agentName = new Map<string, string>((agents ?? []).map((a: any) => [a.id, a.name]));
    const saleRef = new Map<string, string>(
      (sales ?? []).map((s: any) => [s.id, `${s.customer_name}${s.ticket_number ? ` (${s.ticket_number})` : ""}`])
    );

    const query = supabase
      .from("ledger_entries")
      .select(
        "id,entry_date,direction,method,amount_sar,agent_id,sale_id,reference,notes,created_at"
      )
      .order("entry_date", { ascending: false })
      .limit(5000);

    const q = from ? query.gte("entry_date", from).lte("entry_date", to) : query.lte("entry_date", to);
    const { data, error } = await q;
    setBusy(false);
    if (error) return toast.error(error.message);

    downloadCsv(
      `nas-ledger-${from || "start"}-to-${to}.csv`,
      (data ?? []).map((r: any) => ({
        entry_date: r.entry_date,
        direction: r.direction,
        method: r.method,
        amount_sar: r.amount_sar,
        agent_name: r.agent_id ? agentName.get(r.agent_id) ?? "" : "",
        sale_ref: r.sale_id ? saleRef.get(r.sale_id) ?? "" : "",
        reference: r.reference,
        notes: r.notes,
      }))
    );
    toast.success(`Exported ${data?.length ?? 0} ledger rows`);
  }

  async function exportSalesFromSheet() {
    setSheetBusy(true);
    try {
      const data = await fetchSheet("Sales_Report");
      downloadCsv(`google-sales-${today}.csv`, data.rows);
      toast.success(`Downloaded ${data.rows.length} rows from Google Sheet`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSheetBusy(false);
    }
  }

  async function exportAgentsFromSheet() {
    setSheetBusy(true);
    try {
      const data = await fetchSheet("Agent_Report");
      downloadCsv(`google-agents-${today}.csv`, data.rows);
      toast.success(`Downloaded ${data.rows.length} rows from Google Sheet`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSheetBusy(false);
    }
  }

  async function exportLedgerFromSheet() {
    setSheetBusy(true);
    try {
      const data = await fetchSheet("Ledger_Report");
      downloadCsv(`google-ledger-${today}.csv`, data.rows);
      toast.success(`Downloaded ${data.rows.length} rows from Google Sheet`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSheetBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold tracking-tight">Reports</div>
        <div className="text-sm text-muted-foreground">Export CSV files for accounting</div>
      </div>

      <Card className="border-border/60 bg-card/70 backdrop-blur">
        <div className="p-5 space-y-3">
          <div className="text-sm font-semibold flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            Live from Google Sheets
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            These exports read the current values inside your Google Sheet tabs.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button disabled={sheetBusy} onClick={exportSalesFromSheet} className="w-full gap-2">
              <Ticket className="h-4 w-4" />
              Download Sales (Sheet)
            </Button>
            <Button disabled={sheetBusy} onClick={exportAgentsFromSheet} variant="outline" className="w-full gap-2">
              <FileDown className="h-4 w-4" />
              Download Agents (Sheet)
            </Button>
            <Button disabled={sheetBusy} onClick={exportLedgerFromSheet} variant="outline" className="w-full gap-2">
              <Receipt className="h-4 w-4" />
              Download Ledger (Sheet)
            </Button>
          </div>
          <div className="text-[11px] text-muted-foreground">
            If this fails: deploy the Supabase Edge Function <span className="mono">sheets-read</span> and set secrets.
          </div>
        </div>
      </Card>

      <Card className="border-border/60 bg-card/70 backdrop-blur">
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>From (optional)</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Actions</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button disabled={busy} onClick={exportSales} className="w-full gap-2">
                  <Ticket className="h-4 w-4" />
                  Export Sales (CSV)
                </Button>
                <Button disabled={busy} onClick={exportLedger} variant="outline" className="w-full gap-2">
                  <Receipt className="h-4 w-4" />
                  Export Ledger (CSV)
                </Button>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground leading-relaxed">
            Notes:
            <br />
            - CSV downloads start immediately after clicking export.
            <br />
            - Exports include agent/salesman names (not IDs).
          </div>
        </div>
      </Card>
    </div>
  );
}
