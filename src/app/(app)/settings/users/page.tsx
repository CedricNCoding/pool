"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { UserCog, Plus, Trash2, Loader2 } from "lucide-react";

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string | null;
  company: { name: string; color: string } | null;
  isActive: boolean;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "manager", companyId: "" });

  function load() {
    fetch("/api/settings/users").then((r) => r.json()).then(setUsers);
    fetch("/api/companies").then((r) => r.json()).then(setCompanies);
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/settings/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowNew(false);
      setForm({ name: "", email: "", password: "", role: "manager", companyId: "" });
      load();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Desactiver cet utilisateur ?")) return;
    await fetch("/api/settings/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <UserCog className="w-6 h-6 text-ink-600" />
          <h1 className="text-2xl font-bold">Utilisateurs</h1>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouvel utilisateur</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvel utilisateur</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <Label>Mot de passe *</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
              </div>
              <div>
                <Label>Role</Label>
                <select className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="admin">Administrateur</option>
                  <option value="manager">Gestionnaire</option>
                </select>
              </div>
              {form.role === "manager" && (
                <div>
                  <Label>Entreprise *</Label>
                  <select className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm" value={form.companyId} onChange={(e) => setForm(f => ({ ...f, companyId: e.target.value }))} required>
                    <option value="">Selectionner...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-ink-9000 mt-1">Le gestionnaire ne verra que les techniciens de cette entreprise</p>
                </div>
              )}
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Creer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className={!u.isActive ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {u.role === "admin" ? "Admin" : "Gestionnaire"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.company ? (
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: u.company.color }} />
                        {u.company.name}
                      </span>
                    ) : (
                      <span className="text-ink-500">Toutes</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "outline" : "destructive"}>
                      {u.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.isActive && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
