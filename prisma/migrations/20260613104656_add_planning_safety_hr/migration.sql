-- AlterTable
ALTER TABLE "projects" ADD COLUMN "client_name" TEXT;
ALTER TABLE "projects" ADD COLUMN "end_date" DATETIME;
ALTER TABLE "projects" ADD COLUMN "site" TEXT;
ALTER TABLE "projects" ADD COLUMN "start_date" DATETIME;

-- AlterTable
ALTER TABLE "technicians" ADD COLUMN "medical_aptitude" TEXT;
ALTER TABLE "technicians" ADD COLUMN "medical_restriction_until" DATETIME;
ALTER TABLE "technicians" ADD COLUMN "medical_restrictions" TEXT;

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "project_id" TEXT NOT NULL,
    "technician_id" TEXT NOT NULL,
    "start" DATETIME NOT NULL,
    "end" DATETIME NOT NULL,
    "role" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pressenti',
    "created_by_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bookings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bookings_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "absences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "technician_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'cp',
    "start" DATETIME,
    "end" DATETIME,
    "half_start" BOOLEAN NOT NULL DEFAULT false,
    "half_end" BOOLEAN NOT NULL DEFAULT false,
    "recurring_weekday" INTEGER,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'valide',
    "validated_by_id" TEXT,
    "created_by_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "absences_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "equipments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "company_id" TEXT,
    "category" TEXT NOT NULL DEFAULT 'epi',
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "size" TEXT,
    "purchase_date" DATETIME,
    "expiry_date" DATETIME,
    "next_check_date" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'disponible',
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "equipment_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "equipment_id" TEXT NOT NULL,
    "technician_id" TEXT NOT NULL,
    "assigned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returned_at" DATETIME,
    "condition_note" TEXT,
    "created_by_id" TEXT,
    CONSTRAINT "equipment_assignments_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "equipment_assignments_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "equipment_checks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "equipment_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "result" TEXT NOT NULL DEFAULT 'conforme',
    "checked_by" TEXT,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "equipment_checks_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "risk_units" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "risk_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "risk_unit_id" TEXT NOT NULL,
    "danger" TEXT NOT NULL,
    "exposure" TEXT,
    "gravity" INTEGER NOT NULL DEFAULT 2,
    "probability" INTEGER NOT NULL DEFAULT 2,
    "existing_measures" TEXT,
    "planned_measures" TEXT,
    "due_date" DATETIME,
    "responsible" TEXT,
    "status" TEXT NOT NULL DEFAULT 'a_traiter',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "risk_items_risk_unit_id_fkey" FOREIGN KEY ("risk_unit_id") REFERENCES "risk_units" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "safety_briefings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "date" DATETIME NOT NULL,
    "theme" TEXT NOT NULL,
    "animator" TEXT,
    "project_id" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "safety_briefings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "safety_briefing_attendees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "briefing_id" TEXT NOT NULL,
    "technician_id" TEXT NOT NULL,
    "signed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "safety_briefing_attendees_briefing_id_fkey" FOREIGN KEY ("briefing_id") REFERENCES "safety_briefings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "safety_briefing_attendees_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "safety_notices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "published_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "safety_notice_acks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "notice_id" TEXT NOT NULL,
    "technician_id" TEXT NOT NULL,
    "ack_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "safety_notice_acks_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "safety_notices" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "safety_notice_acks_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "skill_campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ouverte',
    "created_by_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "skill_self_assessments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "campaign_id" TEXT NOT NULL,
    "technician_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "proposed_level" INTEGER NOT NULL,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'propose',
    "validated_level" INTEGER,
    "validated_by_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "skill_self_assessments_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "skill_campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "skill_self_assessments_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "interview_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "sections" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "technician_id" TEXT NOT NULL,
    "template_id" TEXT,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planifie',
    "manager_notes" TEXT,
    "employee_notes" TEXT,
    "objectives" TEXT,
    "answers" TEXT NOT NULL DEFAULT '{}',
    "created_by_id" TEXT,
    "signed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interviews_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tender_memo_sections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_technician_certifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technician_id" TEXT NOT NULL,
    "certification_id" TEXT NOT NULL,
    "obtained_date" DATETIME NOT NULL,
    "expiry_date" DATETIME,
    "certificate_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "document_id" TEXT,
    "renewal_status" TEXT NOT NULL DEFAULT 'ok',
    "renewal_date" DATETIME,
    "renewal_organism" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "technician_certifications_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "technician_certifications_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "certifications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "technician_certifications_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_technician_certifications" ("certificate_number", "certification_id", "created_at", "document_id", "expiry_date", "id", "obtained_date", "status", "technician_id") SELECT "certificate_number", "certification_id", "created_at", "document_id", "expiry_date", "id", "obtained_date", "status", "technician_id" FROM "technician_certifications";
DROP TABLE "technician_certifications";
ALTER TABLE "new_technician_certifications" RENAME TO "technician_certifications";
CREATE UNIQUE INDEX "technician_certifications_technician_id_certification_id_key" ON "technician_certifications"("technician_id", "certification_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "bookings_tenant_id_idx" ON "bookings"("tenant_id");

-- CreateIndex
CREATE INDEX "bookings_technician_id_idx" ON "bookings"("technician_id");

-- CreateIndex
CREATE INDEX "bookings_project_id_idx" ON "bookings"("project_id");

-- CreateIndex
CREATE INDEX "absences_tenant_id_idx" ON "absences"("tenant_id");

-- CreateIndex
CREATE INDEX "absences_technician_id_idx" ON "absences"("technician_id");

-- CreateIndex
CREATE INDEX "equipments_tenant_id_idx" ON "equipments"("tenant_id");

-- CreateIndex
CREATE INDEX "equipment_assignments_tenant_id_idx" ON "equipment_assignments"("tenant_id");

-- CreateIndex
CREATE INDEX "equipment_assignments_equipment_id_idx" ON "equipment_assignments"("equipment_id");

-- CreateIndex
CREATE INDEX "equipment_checks_tenant_id_idx" ON "equipment_checks"("tenant_id");

-- CreateIndex
CREATE INDEX "equipment_checks_equipment_id_idx" ON "equipment_checks"("equipment_id");

-- CreateIndex
CREATE INDEX "risk_units_tenant_id_idx" ON "risk_units"("tenant_id");

-- CreateIndex
CREATE INDEX "risk_items_tenant_id_idx" ON "risk_items"("tenant_id");

-- CreateIndex
CREATE INDEX "risk_items_risk_unit_id_idx" ON "risk_items"("risk_unit_id");

-- CreateIndex
CREATE INDEX "safety_briefings_tenant_id_idx" ON "safety_briefings"("tenant_id");

-- CreateIndex
CREATE INDEX "safety_briefing_attendees_tenant_id_idx" ON "safety_briefing_attendees"("tenant_id");

-- CreateIndex
CREATE INDEX "safety_briefing_attendees_briefing_id_idx" ON "safety_briefing_attendees"("briefing_id");

-- CreateIndex
CREATE INDEX "safety_notices_tenant_id_idx" ON "safety_notices"("tenant_id");

-- CreateIndex
CREATE INDEX "safety_notice_acks_tenant_id_idx" ON "safety_notice_acks"("tenant_id");

-- CreateIndex
CREATE INDEX "safety_notice_acks_notice_id_idx" ON "safety_notice_acks"("notice_id");

-- CreateIndex
CREATE INDEX "skill_campaigns_tenant_id_idx" ON "skill_campaigns"("tenant_id");

-- CreateIndex
CREATE INDEX "skill_self_assessments_tenant_id_idx" ON "skill_self_assessments"("tenant_id");

-- CreateIndex
CREATE INDEX "skill_self_assessments_campaign_id_idx" ON "skill_self_assessments"("campaign_id");

-- CreateIndex
CREATE INDEX "interview_templates_tenant_id_idx" ON "interview_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "interviews_tenant_id_idx" ON "interviews"("tenant_id");

-- CreateIndex
CREATE INDEX "interviews_technician_id_idx" ON "interviews"("technician_id");

-- CreateIndex
CREATE INDEX "tender_memo_sections_tenant_id_idx" ON "tender_memo_sections"("tenant_id");
