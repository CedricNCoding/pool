"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

interface ParsedRow {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName: string;
  service?: string;
  contractType?: string;
  contractStart?: string;
  contractEnd?: string;
  valid: boolean;
  errors: string[];
}

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: number } | null>(null);

  function parseCSV(text: string): ParsedRow[] {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

    return lines.slice(1).map((line) => {
      const values: string[] = [];
      let current = "";
      let inQuotes = false;

      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const get = (keys: string[]) => {
        for (const key of keys) {
          const idx = headers.indexOf(key);
          if (idx !== -1 && values[idx]) return values[idx];
        }
        return "";
      };

      const firstName = get(["prenom", "firstname", "first_name", "prénom"]);
      const lastName = get(["nom", "lastname", "last_name"]);
      const email = get(["email", "mail", "e-mail"]);
      const phone = get(["telephone", "phone", "tel", "téléphone"]);
      const companyName = get(["entreprise", "company", "societe", "société"]);
      const service = get(["service", "poste", "fonction"]);
      const contractType = get(["contrat", "contract", "type_contrat", "contract_type"]);
      const contractStart = get(["debut_contrat", "contract_start", "date_debut"]);
      const contractEnd = get(["fin_contrat", "contract_end", "date_fin"]);

      const errors: string[] = [];
      if (!firstName) errors.push("Prenom manquant");
      if (!lastName) errors.push("Nom manquant");
      if (!email) errors.push("Email manquant");
      if (!companyName) errors.push("Entreprise manquante");

      return {
        firstName,
        lastName,
        email,
        phone,
        companyName,
        service,
        contractType,
        contractStart,
        contractEnd,
        valid: errors.length === 0,
        errors,
      };
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text));
      setResult(null);
    };
    reader.readAsText(file, "utf-8");
  }

  async function handleImport() {
    const validRows = rows.filter((r) => r.valid);
    if (!validRows.length) return;

    setImporting(true);
    let imported = 0;
    let errors = 0;

    for (const row of validRows) {
      const res = await fetch("/api/technicians/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      if (res.ok) imported++;
      else errors++;
    }

    setResult({ imported, errors });
    setImporting(false);
  }

  const validCount = rows.filter((r) => r.valid).length;
  const errorCount = rows.filter((r) => !r.valid).length;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/technicians">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Importer des techniciens</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Fichier CSV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                <FileText className="w-12 h-12 text-ink-500 mx-auto mb-4" />
                <p className="text-sm text-ink-500 mb-4">
                  Colonnes attendues : <strong>Nom, Prenom, Email, Telephone, Entreprise, Service, Contrat, Debut_contrat, Fin_contrat</strong>
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Choisir un fichier CSV
                </Button>
              </div>

              {rows.length > 0 && (
                <div className="flex items-center gap-4">
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {validCount} valides
                  </Badge>
                  {errorCount > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-red-50 text-red-700 border-red-200"
                    >
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {errorCount} erreurs
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Apercu ({rows.length} lignes)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Statut</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Prenom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Contrat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 50).map((row, i) => (
                      <TableRow
                        key={i}
                        className={row.valid ? "" : "bg-red-50"}
                      >
                        <TableCell>
                          {row.valid ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <span
                              className="text-red-500 text-xs"
                              title={row.errors.join(", ")}
                            >
                              <AlertCircle className="w-4 h-4" />
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{row.lastName}</TableCell>
                        <TableCell>{row.firstName}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.companyName}</TableCell>
                        <TableCell>{row.service}</TableCell>
                        <TableCell>{row.contractType}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {result && (
                <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-green-700 font-medium">
                    Import termine : {result.imported} techniciens importes
                    {result.errors > 0 && `, ${result.errors} erreurs`}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => router.push("/technicians")}
                  >
                    Voir la liste
                  </Button>
                </div>
              )}

              {!result && (
                <div className="mt-4 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setRows([])}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={importing || validCount === 0}
                  >
                    {importing && (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    )}
                    Importer {validCount} techniciens
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
