import { DOC_CATEGORIES } from "./uploads";

// Documents obligatoires par service (categories du coffre-fort).
// Les electriciens doivent avoir une habilitation ; tous : contrat, identite, medical.
export const REQUIRED_DOCS: Record<string, string[]> = {
  electricien: ["contrat", "identite", "medical", "habilitation"],
  installateur: ["contrat", "identite", "medical"],
  directeur_technique: ["contrat", "identite", "medical"],
  chef_projet: ["contrat", "identite", "medical"],
};
export const DEFAULT_REQUIRED = ["contrat", "identite", "medical"];

export function requiredDocsFor(service: string): string[] {
  return REQUIRED_DOCS[service] ?? DEFAULT_REQUIRED;
}

export function docCategoryLabel(v: string): string {
  return DOC_CATEGORIES.find((c) => c.value === v)?.label ?? v;
}

export function dossierStatus(service: string, presentCategories: string[]) {
  const required = requiredDocsFor(service);
  const missing = required.filter((r) => !presentCategories.includes(r));
  return { required, missing, complete: missing.length === 0 };
}
