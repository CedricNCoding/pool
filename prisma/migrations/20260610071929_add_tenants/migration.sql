-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_agencies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'France',
    "postal_code" TEXT,
    "lat" REAL,
    "lng" REAL,
    "phone" TEXT,
    "tenant_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agencies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "agencies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_agencies" ("address", "city", "company_id", "country", "created_at", "id", "lat", "lng", "name", "phone", "postal_code") SELECT "address", "city", "company_id", "country", "created_at", "id", "lat", "lng", "name", "phone", "postal_code" FROM "agencies";
DROP TABLE "agencies";
ALTER TABLE "new_agencies" RENAME TO "agencies";
CREATE INDEX "agencies_tenant_id_idx" ON "agencies"("tenant_id");
CREATE TABLE "new_api_keys" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "company_id" TEXT,
    "tenant_id" TEXT,
    "permissions" TEXT NOT NULL DEFAULT 'read',
    "last_used_at" DATETIME,
    "expires_at" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "api_keys_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_api_keys" ("company_id", "created_at", "expires_at", "id", "is_active", "key_hash", "key_prefix", "last_used_at", "name", "permissions") SELECT "company_id", "created_at", "expires_at", "id", "is_active", "key_hash", "key_prefix", "last_used_at", "name", "permissions" FROM "api_keys";
DROP TABLE "api_keys";
ALTER TABLE "new_api_keys" RENAME TO "api_keys";
CREATE INDEX "api_keys_tenant_id_idx" ON "api_keys"("tenant_id");
CREATE TABLE "new_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "tenant_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "details" TEXT,
    "ip_address" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_audit_logs" ("action", "created_at", "details", "entity_id", "entity_type", "id", "ip_address", "user_id") SELECT "action", "created_at", "details", "entity_id", "entity_type", "id", "ip_address", "user_id" FROM "audit_logs";
DROP TABLE "audit_logs";
ALTER TABLE "new_audit_logs" RENAME TO "audit_logs";
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");
CREATE TABLE "new_certifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "description" TEXT,
    "validity_months" INTEGER,
    "category" TEXT NOT NULL DEFAULT 'general',
    "color" TEXT NOT NULL DEFAULT '#10B981',
    "level" TEXT NOT NULL DEFAULT 'standard',
    "order" INTEGER NOT NULL DEFAULT 0,
    "tenant_id" TEXT,
    CONSTRAINT "certifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_certifications" ("category", "color", "description", "id", "issuer", "level", "name", "order", "validity_months") SELECT "category", "color", "description", "id", "issuer", "level", "name", "order", "validity_months" FROM "certifications";
DROP TABLE "certifications";
ALTER TABLE "new_certifications" RENAME TO "certifications";
CREATE UNIQUE INDEX "certifications_tenant_id_name_issuer_key" ON "certifications"("tenant_id", "name", "issuer");
CREATE TABLE "new_companies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "siret" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'France',
    "postal_code" TEXT,
    "lat" REAL,
    "lng" REAL,
    "phone" TEXT,
    "email" TEXT,
    "logo_url" TEXT,
    "color" TEXT NOT NULL DEFAULT '#E89B2C',
    "tenant_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "companies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_companies" ("address", "city", "color", "country", "created_at", "email", "id", "lat", "lng", "logo_url", "name", "phone", "postal_code", "siret", "updated_at") SELECT "address", "city", "color", "country", "created_at", "email", "id", "lat", "lng", "logo_url", "name", "phone", "postal_code", "siret", "updated_at" FROM "companies";
DROP TABLE "companies";
ALTER TABLE "new_companies" RENAME TO "companies";
CREATE INDEX "companies_tenant_id_idx" ON "companies"("tenant_id");
CREATE TABLE "new_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technician_id" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'autre',
    "title" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "expiry_date" DATETIME,
    "uploaded_by_id" TEXT,
    "tenant_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "documents_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_documents" ("category", "created_at", "expiry_date", "file_name", "id", "mime_type", "original_name", "size", "technician_id", "title", "uploaded_by_id") SELECT "category", "created_at", "expiry_date", "file_name", "id", "mime_type", "original_name", "size", "technician_id", "title", "uploaded_by_id" FROM "documents";
DROP TABLE "documents";
ALTER TABLE "new_documents" RENAME TO "documents";
CREATE INDEX "documents_technician_id_idx" ON "documents"("technician_id");
CREATE INDEX "documents_tenant_id_idx" ON "documents"("tenant_id");
CREATE TABLE "new_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'actif',
    "company_id" TEXT,
    "tenant_id" TEXT,
    "created_by_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "projects_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_projects" ("company_id", "created_at", "created_by_id", "description", "id", "status", "title", "updated_at") SELECT "company_id", "created_at", "created_by_id", "description", "id", "status", "title", "updated_at" FROM "projects";
DROP TABLE "projects";
ALTER TABLE "new_projects" RENAME TO "projects";
CREATE INDEX "projects_tenant_id_idx" ON "projects"("tenant_id");
CREATE TABLE "new_skill_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366F1',
    "icon" TEXT NOT NULL DEFAULT 'Wrench',
    "order" INTEGER NOT NULL DEFAULT 0,
    "tenant_id" TEXT,
    CONSTRAINT "skill_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_skill_categories" ("color", "icon", "id", "name", "order") SELECT "color", "icon", "id", "name", "order" FROM "skill_categories";
DROP TABLE "skill_categories";
ALTER TABLE "new_skill_categories" RENAME TO "skill_categories";
CREATE UNIQUE INDEX "skill_categories_tenant_id_name_key" ON "skill_categories"("tenant_id", "name");
CREATE TABLE "new_skill_objectives" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "skill_id" TEXT,
    "tenant_id" TEXT,
    "min_level" INTEGER NOT NULL DEFAULT 3,
    "target_percent" INTEGER NOT NULL DEFAULT 80,
    "deadline" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "skill_objectives_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "skill_objectives_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_skill_objectives" ("created_at", "deadline", "id", "label", "min_level", "skill_id", "target_percent") SELECT "created_at", "deadline", "id", "label", "min_level", "skill_id", "target_percent" FROM "skill_objectives";
DROP TABLE "skill_objectives";
ALTER TABLE "new_skill_objectives" RENAME TO "skill_objectives";
CREATE INDEX "skill_objectives_tenant_id_idx" ON "skill_objectives"("tenant_id");
CREATE TABLE "new_skills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "tenant_id" TEXT,
    CONSTRAINT "skills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "skills_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "skill_categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_skills" ("category_id", "description", "id", "name", "order") SELECT "category_id", "description", "id", "name", "order" FROM "skills";
DROP TABLE "skills";
ALTER TABLE "new_skills" RENAME TO "skills";
CREATE INDEX "skills_tenant_id_idx" ON "skills"("tenant_id");
CREATE UNIQUE INDEX "skills_name_category_id_key" ON "skills"("name", "category_id");
CREATE TABLE "new_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748B',
    "tenant_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tags" ("color", "created_at", "id", "name") SELECT "color", "created_at", "id", "name" FROM "tags";
DROP TABLE "tags";
ALTER TABLE "new_tags" RENAME TO "tags";
CREATE UNIQUE INDEX "tags_tenant_id_name_key" ON "tags"("tenant_id", "name");
CREATE TABLE "new_technician_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technician_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'note',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "date" DATETIME NOT NULL,
    "created_by_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "technician_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "technician_events_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_technician_events" ("body", "created_at", "created_by_id", "date", "id", "technician_id", "title", "type") SELECT "body", "created_at", "created_by_id", "date", "id", "technician_id", "title", "type" FROM "technician_events";
DROP TABLE "technician_events";
ALTER TABLE "new_technician_events" RENAME TO "technician_events";
CREATE INDEX "technician_events_technician_id_idx" ON "technician_events"("technician_id");
CREATE INDEX "technician_events_tenant_id_idx" ON "technician_events"("tenant_id");
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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "technicians_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "technicians_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "technicians_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_technicians" ("agency_id", "availability_status", "available_until", "company_id", "contract_end", "contract_start", "contract_type", "created_at", "departure_date", "email", "first_name", "id", "intervention_center_lat", "intervention_center_lng", "intervention_radius_km", "is_active", "last_name", "notes", "phone", "scheduled_deletion_date", "service", "updated_at") SELECT "agency_id", "availability_status", "available_until", "company_id", "contract_end", "contract_start", "contract_type", "created_at", "departure_date", "email", "first_name", "id", "intervention_center_lat", "intervention_center_lng", "intervention_radius_km", "is_active", "last_name", "notes", "phone", "scheduled_deletion_date", "service", "updated_at" FROM "technicians";
DROP TABLE "technicians";
ALTER TABLE "new_technicians" RENAME TO "technicians";
CREATE INDEX "technicians_tenant_id_idx" ON "technicians"("tenant_id");
CREATE TABLE "new_training_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technician_id" TEXT NOT NULL,
    "module_id" TEXT,
    "path_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'propose',
    "note" TEXT,
    "assigned_by_id" TEXT,
    "validated_by_id" TEXT,
    "validated_at" DATETIME,
    "tenant_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "training_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "training_assignments_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "training_assignments_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "training_modules" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "training_assignments_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "training_paths" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_training_assignments" ("assigned_by_id", "created_at", "id", "module_id", "note", "path_id", "status", "technician_id", "updated_at", "validated_at", "validated_by_id") SELECT "assigned_by_id", "created_at", "id", "module_id", "note", "path_id", "status", "technician_id", "updated_at", "validated_at", "validated_by_id" FROM "training_assignments";
DROP TABLE "training_assignments";
ALTER TABLE "new_training_assignments" RENAME TO "training_assignments";
CREATE INDEX "training_assignments_tenant_id_idx" ON "training_assignments"("tenant_id");
CREATE TABLE "new_training_modules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration_hours" INTEGER,
    "cost_eur" INTEGER NOT NULL DEFAULT 0,
    "tenant_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "training_modules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_training_modules" ("cost_eur", "created_at", "description", "duration_hours", "id", "title", "updated_at") SELECT "cost_eur", "created_at", "description", "duration_hours", "id", "title", "updated_at" FROM "training_modules";
DROP TABLE "training_modules";
ALTER TABLE "new_training_modules" RENAME TO "training_modules";
CREATE INDEX "training_modules_tenant_id_idx" ON "training_modules"("tenant_id");
CREATE TABLE "new_training_paths" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "tenant_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "training_paths_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_training_paths" ("created_at", "description", "id", "title", "updated_at") SELECT "created_at", "description", "id", "title", "updated_at" FROM "training_paths";
DROP TABLE "training_paths";
ALTER TABLE "new_training_paths" RENAME TO "training_paths";
CREATE INDEX "training_paths_tenant_id_idx" ON "training_paths"("tenant_id");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'manager',
    "tenant_id" TEXT,
    "company_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_users" ("company_id", "created_at", "email", "id", "is_active", "name", "password_hash", "role", "updated_at") SELECT "company_id", "created_at", "email", "id", "is_active", "name", "password_hash", "role", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
