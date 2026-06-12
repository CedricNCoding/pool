-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_technicians" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company_id" TEXT NOT NULL,
    "agency_id" TEXT,
    "tenant_id" TEXT,
    "service" TEXT NOT NULL DEFAULT 'tech',
    "contract_type" TEXT NOT NULL DEFAULT 'CDI',
    "contract_start" DATETIME,
    "contract_end" DATETIME,
    "intervention_center_lat" REAL,
    "intervention_center_lng" REAL,
    "intervention_radius_km" INTEGER NOT NULL DEFAULT 50,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "availability_status" TEXT NOT NULL DEFAULT 'disponible',
    "available_until" DATETIME,
    "departure_date" DATETIME,
    "scheduled_deletion_date" DATETIME,
    "notes" TEXT,
    "medical_visit_date" DATETIME,
    "medical_visit_periodicity_months" INTEGER NOT NULL DEFAULT 24,
    "driving_licenses" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "technicians_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "technicians_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "technicians_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_technicians" ("agency_id", "availability_status", "available_until", "company_id", "contract_end", "contract_start", "contract_type", "created_at", "departure_date", "email", "first_name", "id", "intervention_center_lat", "intervention_center_lng", "intervention_radius_km", "is_active", "last_name", "notes", "phone", "scheduled_deletion_date", "service", "tenant_id", "updated_at") SELECT "agency_id", "availability_status", "available_until", "company_id", "contract_end", "contract_start", "contract_type", "created_at", "departure_date", "email", "first_name", "id", "intervention_center_lat", "intervention_center_lng", "intervention_radius_km", "is_active", "last_name", "notes", "phone", "scheduled_deletion_date", "service", "tenant_id", "updated_at" FROM "technicians";
DROP TABLE "technicians";
ALTER TABLE "new_technicians" RENAME TO "technicians";
CREATE INDEX "technicians_tenant_id_idx" ON "technicians"("tenant_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
