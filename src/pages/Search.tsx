import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search as SearchIcon } from "lucide-react";
import { formatSar } from "@/lib/format";

type SaleResult = {
  id: string;
  sale_date: string;
  customer_name: string;
  customer_mobile: string | null;
  ticket_number: string | null;
  sell_amount_sar: number;
  cost_amount_sar: number;
  profit_sar: number;
};

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SaleResult[]>([]);

  const hint = useMemo(() => {
    const s = q.trim();
    if (!s) return "Search by customer name, ticket number, or mobile";
    if (/^\d{8,}$/.test(s)) return "Looks like a mobile number";
    return "";
  }, [q]);

  async function run() {
    const s = q.trim();
    if (!s) return;

    setLoading(true);

    // Use ILIKE for name and ticket; keep mobile as contains too.
    // Note: Supabase .or syntax uses comma-separated filters.
    const needle = s.replaceAll("%", "");

    const { data, error } = await supabase
      .from("sales")
      .select(
        "id,sale_date,customer_name,customer_mobile,ticket_number,sell_amount_sar,cost_amount_sar,profit_sar"
      )
      .or(
        `customer_name.ilike.%${needle}%,ticket_number.ilike.%${needle}%,customer_mobile.ilike.%${needle}%`
      )
      .order("sale_date", { ascending: false })
      .limit(200);

    if (error) toast.error(error.message);
    setRows((data ?? []) as SaleResult[]);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold tracking-tight">Search</div>
        <div className="text-sm text-muted-foreground">Find sales by customer name, ticket number, or mobile</div>
      </div>

      <Card className="border-border/60 bg-card/70 backdrop-blur">
        <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Customer / Ticket / Mobile"
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
            }}
          />
          <Button className="gap-2" onClick={run} disabled={loading}>
            <SearchIcon className="h-4 w-4" />
            {loading ? "Searching…" : "Search"}
          </Button>
        </div>
        {hint && <div className="px-4 pb-4 text-xs text-muted-foreground">{hint}</div>}
      </Card>

      <Card className="border-border/60 bg-card/70 backdrop-blur">
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Mobile</TableHead>
                <TableHead className="hidden lg:table-cell">Ticket</TableHead>
                <TableHead className="text-right">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="mono">{r.sale_date}</TableCell>
                  <TableCell className="font-medium">{r.customer_name}</TableCell>
                  <TableCell className="hidden md:table-cell">{r.customer_mobile ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{r.ticket_number ?? "—"}</TableCell>
                  <TableCell className="text-right mono text-primary">{formatSar(r.profit_sar)}</TableCell>
                </TableRow>
              ))}

              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground">
        Tip: If you want search inside payments, use the Payments page search box.
      </div>
    </div>
  );
}
