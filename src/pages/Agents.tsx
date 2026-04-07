import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, RefreshCcw, Upload, BadgeDollarSign } from "lucide-react";
import { formatSar } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from "xlsx";

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
  total_credit_sar: number;
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
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [balances, setBalances] = useState<Record<string, AgentBalance>>({});
  const [q, setQ] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<{ name: string; opening_balance_sar: number }>>([]);
  const [importFileName, setImportFileName] = useState<string>("");

  const [creditOpen, setCreditOpen] = useState(false);
  const [creditAgent, setCreditAgent] = useState<Agent | null>(null);
  const [creditAmount, setCreditAmount] = useState("0");
  const [creditNotes, setCreditNotes] = useState("");
  const [creditBusy, setCreditBusy] = useState(false);

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

  async function parseAgentWorkbook(file: File) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });

    function normalizeName(s: string) {
      return s
        .replace(/\s+/g, " ")
        .replace(/\bPAID\b/gi, "")
        .replace(/\bAND\b/gi, "")
        .replace(/\bSALES\b/gi, "")
        .replace(/\bBALANCE\b/gi, "")
        .replace(/[&]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function extractBalanceFromSheet(sheetName: string) {
      try {
        const ws = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: false }) as any;
        for (const row of rows) {
          for (let i = 0; i < row.length; i++) {
            const cell = row[i];
            if (typeof cell === "string" && cell.trim().toLowerCase() === "balance") {
              const next = row[i + 1];
              const val = Number(next);
              if (!Number.isNaN(val)) return val;
            }
          }
        }
      } catch {
        // ignore
      }
      return 0;
    }

    const agentMap = new Map<string, { name: string; opening_balance_sar: number }>();

    for (const sh of wb.SheetNames) {
      const name = normalizeName(sh);
      if (!name) continue;
      const balance = /balance/i.test(sh) ? extractBalanceFromSheet(sh) : 0;

      const key = name.toLowerCase();
      const prev = agentMap.get(key);
      if (!prev) {
        agentMap.set(key, { name, opening_balance_sar: Number(balance || 0) });
      } else if (!prev.opening_balance_sar && balance) {
        prev.opening_balance_sar = Number(balance || 0);
      }
    }

    const list = Array.from(agentMap.values())
      .filter((a) => a.name)
      .sort((a, b) => a.name.localeCompare(b.name));

    return list;
  }

  async function importAgents(list: Array<{ name: string; opening_balance_sar: number }>) {
    setImportBusy(true);

    const { data: existing, error: e1 } = await supabase
      .from("agents")
      .select("id,name,opening_balance_sar")
      .order("name", { ascending: true });

    if (e1) {
      setImportBusy(false);
      toast.error(e1.message);
      return;
    }

    const map = new Map<string, Agent>();
    (existing ?? []).forEach((a: any) => map.set(String(a.name).toLowerCase(), a as Agent));

    const toInsert: any[] = [];
    const toUpdate: Array<{ id: string; opening_balance_sar: number }> = [];

    for (const row of list) {
      const key = row.name.toLowerCase();
      const found = map.get(key);
      if (!found) {
        toInsert.push({
          name: row.name,
          opening_balance_sar: Number(row.opening_balance_sar || 0),
          phone: null,
          email: null,
          notes: "Imported from Excel",
        });
      } else {
        const newBal = Number(row.opening_balance_sar || 0);
        if (newBal && Number(found.opening_balance_sar || 0) !== newBal) {
          toUpdate.push({ id: found.id, opening_balance_sar: newBal });
        }
      }
    }

    if (toInsert.length) {
      const { error } = await supabase.from("agents").insert(toInsert);
      if (error) {
        setImportBusy(false);
        toast.error(error.message);
        return;
      }
    }

    for (const u of toUpdate) {
      const { error } = await supabase.from("agents").update({ opening_balance_sar: u.opening_balance_sar }).eq("id", u.id);
      if (error) {
        setImportBusy(false);
        toast.error(error.message);
        return;
      }
    }

    toast.success(`Imported: ${toInsert.length} new, ${toUpdate.length} updated`);
    setImportBusy(false);
    setImportOpen(false);
    setImportPreview([]);
    setImportFileName("");
    await load();
  }

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
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              setImportOpen(true);
            }}
          >
            <Upload className="h-4 w-4" />
            Import Excel
          </Button>

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

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Import agents from Excel</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Upload your Excel and we will create agents using the sheet names. If the sheet contains a
              “Balance” value, it will be used as opening balance.
            </div>

            <div className="grid gap-2">
              <Label>Excel file</Label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    setImportFileName(f.name);
                    setImportPreview([]);
                    const list = await parseAgentWorkbook(f);
                    if (!list.length) {
                      toast.error("No agents found in this workbook");
                      return;
                    }
                    setImportPreview(list);
                    toast.success(`Parsed ${list.length} agents`);
                  } catch (err: any) {
                    toast.error(err?.message ?? "Failed to read Excel");
                  }
                }}
              />
              {importFileName && <div className="text-xs text-muted-foreground">Selected: {importFileName}</div>}
            </div>

            <Card className="border-border/60 bg-card/50">
              <div className="p-3">
                <div className="text-sm font-semibold">Preview</div>
                <div className="mt-2 max-h-[320px] overflow-auto rounded-lg border border-border/60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead className="text-right">Opening balance (SAR)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.slice(0, 200).map((r) => (
                        <TableRow key={r.name}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell className="text-right mono">{formatSar(r.opening_balance_sar)}</TableCell>
                        </TableRow>
                      ))}
                      {importPreview.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2} className="py-10 text-center text-sm text-muted-foreground">
                            Upload an Excel file to see preview.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {importPreview.length > 200 && (
                  <div className="mt-2 text-xs text-muted-foreground">Showing first 200 rows.</div>
                )}
              </div>
            </Card>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importBusy}>
                Cancel
              </Button>
              <Button
                className="gap-2"
                disabled={importBusy || importPreview.length === 0}
                onClick={() => importAgents(importPreview)}
              >
                {importBusy ? "Importing…" : "Import to Supabase"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Agent credit adjustment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-background/40 p-3">
              <div className="text-sm font-semibold">{creditAgent?.name ?? "Agent"}</div>
              <div className="text-xs text-muted-foreground">This will create a ledger entry: direction = agent_credit</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Credit amount (SAR)</Label>
                <Input value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} inputMode="decimal" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={creditNotes} onChange={(e) => setCreditNotes(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <Button
              className="w-full gap-2"
              disabled={creditBusy || !creditAgent}
              onClick={async () => {
                const amt = Number(creditAmount || 0);
                if (!amt || amt <= 0) return toast.error("Amount must be > 0");
                if (!creditAgent) return;
                try {
                  setCreditBusy(true);
                  const { error } = await supabase.from("ledger_entries").insert({
                    entry_date: new Date().toISOString().slice(0, 10),
                    direction: "agent_credit",
                    method: "credit",
                    amount_sar: amt,
                    agent_id: creditAgent.id,
                    sale_id: null,
                    reference: null,
                    notes: creditNotes.trim() || "Agent credit adjustment",
                  });
                  if (error) throw error;
                  toast.success("Credit entry saved");
                  setCreditBusy(false);
                  setCreditOpen(false);
                  setCreditAgent(null);
                  setCreditAmount("0");
                  setCreditNotes("");
                  await load();
                } catch (e: any) {
                  setCreditBusy(false);
                  toast.error(e?.message ?? "Failed");
                }
              }}
            >
              <BadgeDollarSign className="h-4 w-4" />
              {creditBusy ? "Saving…" : "Save credit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border-border/60 bg-card/70 backdrop-blur">
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="text-right">Credit (SAR)</TableHead>
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
                    <TableCell className="text-right mono">{formatSar(bal?.total_credit_sar ?? 0)}</TableCell>
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

                        {isAdmin ? (
                          <>
                            <Button
                              size="icon"
                              variant="outline"
                              title="Add credit adjustment"
                              onClick={() => {
                                setCreditAgent(a);
                                setCreditOpen(true);
                              }}
                            >
                              <BadgeDollarSign className="h-4 w-4" />
                            </Button>

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
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">No actions</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No agents yet.
                  </TableCell>
                </TableRow>
              )}

              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
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
