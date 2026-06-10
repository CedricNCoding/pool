"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Mail, Save, TestTube, Loader2, CheckCircle, AlertCircle, Send } from "lucide-react";

export default function SmtpPage() {
  const [form, setForm] = useState({
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_pass: "",
    smtp_from: "",
    smtp_secure: "false",
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleDigest() {
    setSending(true);
    setMessage(null);
    const res = await fetch("/api/reminders/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: 90 }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage({
        type: "success",
        text: data.sent
          ? `Digest envoye a ${data.to} (${data.count} echeance(s))`
          : data.message || "Aucune echeance a signaler",
      });
    } else {
      setMessage({ type: "error", text: data.error || "Echec de l'envoi" });
    }
    setSending(false);
  }

  useEffect(() => {
    fetch("/api/settings/smtp")
      .then((r) => r.json())
      .then((data) => {
        setForm((f) => ({
          ...f,
          ...data,
          smtp_pass: "",
        }));
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const payload = { ...form };
    if (!payload.smtp_pass) delete (payload as Record<string, string>).smtp_pass;

    const res = await fetch("/api/settings/smtp", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setMessage({ type: "success", text: "Configuration SMTP sauvegardee" });
    } else {
      setMessage({ type: "error", text: "Erreur de sauvegarde" });
    }
    setSaving(false);
  }

  async function handleTest() {
    setTesting(true);
    setMessage(null);
    const res = await fetch("/api/settings/smtp", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setMessage({ type: "success", text: data.message });
    } else {
      setMessage({ type: "error", text: data.error });
    }
    setTesting(false);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Mail className="w-6 h-6 text-ink-600" />
        <h1 className="text-2xl font-bold">Configuration SMTP</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Serveur de messagerie pour les rappels de certification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            {message && (
              <div
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Serveur SMTP</Label>
                <Input
                  value={form.smtp_host}
                  onChange={(e) => setForm((f) => ({ ...f, smtp_host: e.target.value }))}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <Label>Port</Label>
                <Input
                  value={form.smtp_port}
                  onChange={(e) => setForm((f) => ({ ...f, smtp_port: e.target.value }))}
                  placeholder="587"
                />
              </div>
              <div>
                <Label>Utilisateur</Label>
                <Input
                  value={form.smtp_user}
                  onChange={(e) => setForm((f) => ({ ...f, smtp_user: e.target.value }))}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label>Mot de passe</Label>
                <Input
                  type="password"
                  value={form.smtp_pass}
                  onChange={(e) => setForm((f) => ({ ...f, smtp_pass: e.target.value }))}
                  placeholder="Laisser vide pour ne pas modifier"
                />
              </div>
              <div>
                <Label>Adresse expediteur</Label>
                <Input
                  value={form.smtp_from}
                  onChange={(e) => setForm((f) => ({ ...f, smtp_from: e.target.value }))}
                  placeholder="noreply@avpool.local"
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={form.smtp_secure === "true"}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, smtp_secure: checked ? "true" : "false" }))
                  }
                />
                <Label>SSL/TLS</Label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder
              </Button>
              <Button type="button" variant="outline" onClick={handleTest} disabled={testing}>
                {testing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                <TestTube className="w-4 h-4 mr-2" />
                Tester la connexion
              </Button>
              <Button type="button" variant="outline" onClick={handleDigest} disabled={sending}>
                {sending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                <Send className="w-4 h-4 mr-2" />
                Envoyer le digest des echeances
              </Button>
            </div>
            <p className="text-xs text-ink-9000">
              Le digest recapitule les certifications et documents (visite medicale,
              habilitations...) arrivant a echeance sous 90 jours, envoye a l&apos;adresse
              expediteur. A automatiser par cron en production.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
