import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, RefreshCcw } from "lucide-react";

type Salesman = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  active: boolean;
};

function SalesmanForm({
  initial,
  onSave,
}: {
  initial?: Partial<Salesman>;
  onSave: (values: Partial<Salesman>) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [active, setActive] = useState(initial?.active ?? true);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Salesman name" />
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
          <Label>Active</Label>
          <div className="h-10 flex items-center gap-3 rounded-md border border-input px-3">
            <Switch checked={active} onCheckedChange={setActive} />
            <span className="text-sm text-muted-foreground">{active ? "Active" : "Inactive"}</span>
          </div>
        </div>
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
              active,
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

export default function Salesmen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Salesman[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("salesmen")
      .select("id,name,phone,email,active")
      .order("name", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Salesman[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(s) || (r.phone ?? "").includes(s));
  }, [rows, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Salesmen</div>
          <div className="text-sm text-muted-foreground">Your internal staff</div>
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
                <DialogTitle>New salesman</DialogTitle>
              </DialogHeader>
              <SalesmanForm
                onSave={async (values) => {
                  const { error } = await supabase.from("salesmen").insert(values);
                  if (error) throw error;
                  toast.success("Salesman created");
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
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[140px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{r.phone ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{r.email ?? "—"}</TableCell>
                  <TableCell>
                    <span className={r.active ? "text-primary" : "text-muted-foreground"}>
                      {r.active ? "Yes" : "No"}
                    </span>
                  </TableCell>
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
                            <DialogTitle>Edit salesman</DialogTitle>
                          </DialogHeader>
                          <SalesmanForm
                            initial={r}
                            onSave={async (values) => {
                              const { error } = await supabase.from("salesmen").update(values).eq("id", r.id);
                              if (error) throw error;
                              toast.success("Updated");
                              await load();
                            }}
                          />
                        </DialogContent>
                      </Dialog>

                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={async () => {
                          if (!confirm(`Delete salesman "${r.name}"?`)) return;
                          const { error } = await supabase.from("salesmen").delete().eq("id", r.id);
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
              ))}

              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No salesmen yet.
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
