-- CreateTable
CREATE TABLE "training_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "module_id" TEXT,
    "path_id" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planifiee',
    "start_date" DATETIME,
    "end_date" DATETIME,
    "location" TEXT,
    "trainer" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "training_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "training_sessions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "training_modules" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "training_sessions_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "training_paths" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "training_session_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "category" TEXT NOT NULL DEFAULT 'autre',
    "title" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_by_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "training_session_documents_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "training_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "training_session_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "training_session_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'status',
    "label" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "training_session_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "training_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "training_session_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_training_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technician_id" TEXT NOT NULL,
    "module_id" TEXT,
    "path_id" TEXT,
    "session_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'propose',
    "note" TEXT,
    "cost_eur" REAL,
    "funding_source" TEXT,
    "funding_ref" TEXT,
    "assigned_by_id" TEXT,
    "validated_by_id" TEXT,
    "validated_at" DATETIME,
    "tenant_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "training_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "training_assignments_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "training_assignments_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "training_modules" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "training_assignments_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "training_paths" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "training_assignments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "training_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_training_assignments" ("assigned_by_id", "created_at", "id", "module_id", "note", "path_id", "status", "technician_id", "tenant_id", "updated_at", "validated_at", "validated_by_id") SELECT "assigned_by_id", "created_at", "id", "module_id", "note", "path_id", "status", "technician_id", "tenant_id", "updated_at", "validated_at", "validated_by_id" FROM "training_assignments";
DROP TABLE "training_assignments";
ALTER TABLE "new_training_assignments" RENAME TO "training_assignments";
CREATE INDEX "training_assignments_tenant_id_idx" ON "training_assignments"("tenant_id");
CREATE INDEX "training_assignments_session_id_idx" ON "training_assignments"("session_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "training_sessions_tenant_id_idx" ON "training_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "training_session_documents_session_id_idx" ON "training_session_documents"("session_id");

-- CreateIndex
CREATE INDEX "training_session_documents_tenant_id_idx" ON "training_session_documents"("tenant_id");

-- CreateIndex
CREATE INDEX "training_session_events_session_id_idx" ON "training_session_events"("session_id");

-- CreateIndex
CREATE INDEX "training_session_events_tenant_id_idx" ON "training_session_events"("tenant_id");

-- DataMigration : regroupe les affectations existantes en sessions (1 session par
-- module, 1 par parcours). Ids deterministes ('mig-mod-<moduleId>') pour relier
-- ensuite les affectations sans table de correspondance.
INSERT INTO "training_sessions" ("id", "tenant_id", "module_id", "title", "status", "created_at", "updated_at")
SELECT 'mig-mod-' || a."module_id", a."tenant_id", a."module_id",
       COALESCE(m."title", 'Session de formation'), 'en_cours', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "module_id", "tenant_id" FROM "training_assignments" WHERE "module_id" IS NOT NULL) a
LEFT JOIN "training_modules" m ON m."id" = a."module_id";

UPDATE "training_assignments" SET "session_id" = 'mig-mod-' || "module_id" WHERE "module_id" IS NOT NULL;

INSERT INTO "training_sessions" ("id", "tenant_id", "path_id", "title", "status", "created_at", "updated_at")
SELECT 'mig-path-' || a."path_id", a."tenant_id", a."path_id",
       COALESCE(p."title", 'Parcours') || ' (parcours)', 'en_cours', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "path_id", "tenant_id" FROM "training_assignments" WHERE "path_id" IS NOT NULL) a
LEFT JOIN "training_paths" p ON p."id" = a."path_id";

UPDATE "training_assignments" SET "session_id" = 'mig-path-' || "path_id" WHERE "path_id" IS NOT NULL AND "session_id" IS NULL;

-- 1er evenement d'historique pour chaque session reprise.
INSERT INTO "training_session_events" ("id", "session_id", "tenant_id", "kind", "label", "actor_name", "created_at")
SELECT 'mig-evt-' || s."id", s."id", s."tenant_id", 'info',
       'Session creee a partir des affectations existantes', 'Systeme', CURRENT_TIMESTAMP
FROM "training_sessions" s WHERE s."id" LIKE 'mig-%';
