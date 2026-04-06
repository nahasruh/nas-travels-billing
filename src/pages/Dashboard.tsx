import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { formatSar } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

type Totals = {
  total_sales_sar: number;
  total_cost_sar: number;
  total_profit_sar: number;
  ledger_balance_sar: number;
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<Totals | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("v_dashboard_totals").select("*").single();
    if (!error) setTotals(data as Totals);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const items = [
    { label: "Total Sales", value: totals?.total_sales_sar ?? 0 },
    { label: "Total Cost", value: totals?.total_cost_sar ?? 0 },
    { label: "Total Profit", value: totals?.total_profit_sar ?? 0 },
    { label: "Ledger Balance", value: totals?.ledger_balance_sar ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Dashboard</div>
          <div className="text-sm text-muted-foreground">Live totals from Supabase (Sales + Payments)</div>
        </div>
        <Button variant="outline" className="gap-2" onClick={load}>
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((it) => (
          <Card key={it.label} className="border-border/60 bg-card/70 backdrop-blur">
            <div className="p-5">
              <div className="text-xs text-muted-foreground">{it.label}</div>
              <div className="mt-2 text-2xl font-semibold mono">{formatSar(it.value)}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-border/60 bg-card/70 backdrop-blur">
        <div className="p-5">
          <div className="text-sm font-semibold">Getting started</div>
          <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
            1) Create <b>Agents</b> (your suppliers)<br />
            2) Create <b>Salesmen</b><br />
            3) Add <b>Sales (Tickets)</b><br />
            4) Add <b>Payments</b> (customer receipts + agent payments)
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            {loading ? "Loading totals…" : "Ready."}
          </div>
        </div>
      </Card>
    </div>
  );
}
