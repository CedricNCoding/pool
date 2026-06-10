"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircleUser, Loader2, CheckCircle } from "lucide-react";
import { useSession } from "@/lib/hooks";

export default function AccountPage() {
  const { user } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    if (newPassword && newPassword !== confirm) {
      setError("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    if (!currentPassword) {
      setError("Saisissez votre mot de passe actuel pour confirmer.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        currentPassword,
        ...(newPassword ? { newPassword } : {}),
      }),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      if (d.emailChanged) {
        // L'email a change -> le jeton est obsolete, on redirige vers la connexion.
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        router.push("/login");
        return;
      }
      setOk("Modifications enregistrees.");
    } else {
      setError((await res.json().catch(() => ({}))).error || "Echec de l'enregistrement.");
    }
  }

  return (
    <div className="p-8 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <CircleUser className="w-6 h-6 text-ink-600" />
        <h1 className="text-2xl font-bold">Mon compte</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identifiants</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm border border-red-200">{error}</div>}
            {ok && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-sm border border-emerald-200">
                <CheckCircle className="w-4 h-4" /> {ok}
              </div>
            )}

            <div>
              <Label>Nom</Label>
              <Input value={user?.name ?? ""} disabled className="bg-paper-2" />
              <p className="text-xs text-ink-400 mt-1">Pour changer votre nom, contactez un administrateur.</p>
            </div>

            <div>
              <Label>Adresse email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="border-t border-ink-900/10 pt-4">
              <Label>Nouveau mot de passe</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Laisser vide pour ne pas changer" minLength={8} />
            </div>
            {newPassword && (
              <div>
                <Label>Confirmer le nouveau mot de passe</Label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} />
              </div>
            )}

            <div className="border-t border-ink-900/10 pt-4">
              <Label>Mot de passe actuel *</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Requis pour confirmer toute modification" required />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Enregistrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
