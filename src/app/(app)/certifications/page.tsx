"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import { CERT_CATEGORIES } from "@/lib/constants";

interface Certification {
  id: string;
  name: string;
  issuer: string;
  description: string | null;
  validityMonths: number | null;
  category: string;
  color: string;
  level: string;
}

const LEVEL_LABELS: Record<string, string> = {
  foundation: "Foundation",
  standard: "Standard",
  advanced: "Advanced",
  expert: "Expert",
};

export default function CertificationsPage() {
  const [certs, setCerts] = useState<Certification[]>([]);

  useEffect(() => {
    fetch("/api/certifications")
      .then((r) => r.json())
      .then(setCerts);
  }, []);

  const grouped = CERT_CATEGORIES.map((cat) => ({
    ...cat,
    certs: certs.filter((c) => c.category === cat.value),
  })).filter((g) => g.certs.length > 0);

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Award className="w-6 h-6 text-slate-700" />
        <h1 className="text-2xl font-bold">Referentiel des certifications</h1>
        <Badge variant="secondary">{certs.length} certifications</Badge>
      </div>

      <div className="space-y-6">
        {grouped.map((group) => (
          <Card key={group.value}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                {group.label}
                <Badge variant="outline" className="ml-2">
                  {group.certs.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.certs.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition"
                  >
                    <div
                      className="w-2 h-full min-h-[40px] rounded-full flex-shrink-0"
                      style={{ backgroundColor: cert.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{cert.name}</p>
                      <p className="text-xs text-slate-500">{cert.issuer}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{
                            borderColor: cert.color,
                            color: cert.color,
                          }}
                        >
                          {LEVEL_LABELS[cert.level] || cert.level}
                        </Badge>
                        {cert.validityMonths ? (
                          <span className="text-xs text-slate-400">
                            Validite {cert.validityMonths} mois
                          </span>
                        ) : (
                          <span className="text-xs text-green-500">
                            Sans expiration
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
