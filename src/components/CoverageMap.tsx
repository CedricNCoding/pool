"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

const TechniciansMap = dynamic(() => import("@/components/TechniciansMap"), { ssr: false });

interface MapTech {
  id: string;
  name: string;
  lat: number;
  lng: number;
  company: string;
  color: string;
  skillIds: string[];
}
interface Category {
  id: string;
  name: string;
  color: string;
  skills: { id: string; name: string }[];
}

export default function CoverageMap() {
  const router = useRouter();
  const [techs, setTechs] = useState<MapTech[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skillId, setSkillId] = useState("");

  useEffect(() => {
    fetch("/api/technicians/map").then((r) => r.json()).then(setTechs).catch(() => {});
    fetch("/api/skills/categories").then((r) => r.json()).then(setCategories).catch(() => {});
  }, []);

  const points = useMemo(
    () =>
      (skillId ? techs.filter((t) => t.skillIds.includes(skillId)) : techs).map((t) => ({
        id: t.id,
        name: t.name,
        service: "",
        lat: t.lat,
        lng: t.lng,
        company: t.company,
        color: t.color,
      })),
    [techs, skillId]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="w-5 h-5" /> Couverture territoriale
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-500">{points.length} tech.</span>
          <select
            className="px-3 py-1.5 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm"
            value={skillId}
            onChange={(e) => setSkillId(e.target.value)}
          >
            <option value="">Toutes competences</option>
            {categories.map((cat) => (
              <optgroup key={cat.id} label={cat.name}>
                {cat.skills.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-ink-9000 mb-3">
          {skillId
            ? "Les zones sans point sont des zones blanches pour cette competence."
            : "Repartition de tous les techniciens actifs geolocalises."}
        </p>
        <div className="h-[420px] w-full">
          <TechniciansMap points={points} onSelect={(id) => router.push(`/technicians/${id}`)} />
        </div>
      </CardContent>
    </Card>
  );
}
