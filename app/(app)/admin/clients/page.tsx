"use client";

import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { Card, Badge, Button, SectionTitle, EmptyHint } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth";
import {
  loadClients, saveClients, CLIENT_CATEGORIES, CLIENT_REGIONS, CLIENT_STATUSES, STATUS_TONE,
  type Client, type ClientStatus,
} from "@/lib/clients";
import { uploadFile } from "@/lib/content";

const blankForm = () => ({ id: "", name: "", category: CLIENT_CATEGORIES[0], region: CLIENT_REGIONS[0], status: "Onboarding" as ClientStatus, contact: "", notes: "", logoUrl: "" });

export default function ClientsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const toast = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<string>("All");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(blankForm());
  const [uploading, setUploading] = useState(false);

  useEffect(() => { (async () => { setClients(await loadClients()); setLoaded(true); })(); }, []);

  if (!isAdmin) return <EmptyHint>Clients are managed by administrators.</EmptyHint>;

  async function persist(next: Client[]) {
    setClients(next);
    const ok = await saveClients(next);
    if (!ok) { toast("Couldn't save — please try again.", "error"); setClients(await loadClients()); }
  }

  function startAdd() { setForm(blankForm()); setEditing(true); }
  function startEdit(c: Client) { setForm({ ...blankForm(), ...c }); setEditing(true); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast("Give the client a name", "error"); return; }
    const exists = clients.some((c) => c.id === form.id);
    const record: Client = {
      id: form.id || `c-${Date.now()}`,
      name: form.name.trim(),
      category: form.category,
      region: form.region,
      status: form.status,
      contact: form.contact?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      logoUrl: form.logoUrl?.trim() || undefined,
    };
    await persist(exists ? clients.map((c) => (c.id === record.id ? record : c)) : [...clients, record]);
    toast(exists ? "Client updated" : "Client added");
    setEditing(false);
  }

  async function remove(id: string) {
    await persist(clients.filter((c) => c.id !== id));
    toast("Client removed");
  }

  async function onLogoFile(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast("Please choose an image file (PNG, JPG, SVG…).", "error"); return; }
    setUploading(true);
    const res = await uploadFile(f);
    setUploading(false);
    if (res.error) { toast(res.error, "error"); return; }
    setForm((prev) => ({ ...prev, logoUrl: res.url || res.dataUrl || "" }));
    toast("Logo uploaded");
  }

  // categories that actually appear (for the filter rail), plus "All"
  const usedCategories = Array.from(new Set(clients.map((c) => c.category)));
  const visible = filter === "All" ? clients : clients.filter((c) => c.category === filter);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle sub="Add, categorize and manage the organizations you run the Theory of Change program for.">
          Clients
        </SectionTitle>
        <Button size="sm" onClick={startAdd}><Icons.Plus className="h-4 w-4" /> Add client</Button>
      </div>

      {editing && (
        <Card className="mb-4 p-5">
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm font-semibold">{form.id ? "Edit client" : "New client"}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Client name</span>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. MAS GLA" className="modal-input" autoFocus />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Category</span>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="modal-input">
                  {CLIENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Region</span>
                <select value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} className="modal-input">
                  {CLIENT_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Status</span>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ClientStatus }))} className="modal-input">
                  {CLIENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Primary contact (optional)</span>
                <input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} placeholder="name or email" className="modal-input" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Notes (optional)</span>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="modal-input h-20" />
              </label>
              <div className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Client logo (optional)</span>
                <p className="mb-2 text-xs text-muted-foreground">Shown across the portal beside the Amal &amp; Company logo. PNG, JPG or SVG — a transparent background works best.</p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-14 w-32 items-center justify-center overflow-hidden rounded-lg border bg-background">
                    {form.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.logoUrl} alt="Client logo preview" className="h-full w-auto max-w-full object-contain p-1.5" />
                    ) : (
                      <span className="text-xs text-muted-foreground">No logo</span>
                    )}
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-secondary">
                    {uploading ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Upload className="h-4 w-4" />}
                    {form.logoUrl ? "Replace logo" : "Upload logo"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onLogoFile(e.target.files?.[0])} disabled={uploading} />
                  </label>
                  {form.logoUrl && (
                    <button type="button" onClick={() => setForm((f) => ({ ...f, logoUrl: "" }))} className="inline-flex items-center gap-1 text-sm text-[hsl(var(--danger))] hover:underline">
                      <Icons.X className="h-4 w-4" /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" type="submit">{form.id ? "Save client" : "Add client"}</Button>
              <Button size="sm" variant="outline" type="button" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {/* category filter rail */}
      {clients.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {["All", ...usedCategories].map((c) => (
            <button key={c} onClick={() => setFilter(c)} className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${filter === c ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-secondary"}`}>
              {c}{c !== "All" ? ` (${clients.filter((x) => x.category === c).length})` : ""}
            </button>
          ))}
        </div>
      )}

      {!loaded ? (
        <div className="flex justify-center py-10"><Icons.Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : visible.length === 0 ? (
        <EmptyHint>No clients{filter !== "All" ? ` in “${filter}”` : ""} yet. Click “Add client” to create one.</EmptyHint>
      ) : (
        <div className="space-y-3">
          {visible.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start gap-4">
                {c.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.logoUrl} alt={`${c.name} logo`} className="h-11 w-11 shrink-0 rounded-xl border bg-background object-contain p-1" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent"><Icons.Building2 className="h-5 w-5" /></span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{c.name}</h3>
                    <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge tone="accent">{c.category}</Badge>
                    <Badge tone="muted"><Icons.MapPin className="h-3 w-3" /> {c.region}</Badge>
                    {c.contact && <Badge tone="muted"><Icons.User className="h-3 w-3" /> {c.contact}</Badge>}
                  </div>
                  {c.notes && <p className="mt-2 text-sm text-muted-foreground">{c.notes}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => startEdit(c)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary" aria-label="Edit"><Icons.Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(c.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-[hsl(var(--danger)/0.1)] hover:text-[hsl(var(--danger))]" aria-label="Remove"><Icons.Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
