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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "technician_certifications_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "technician_certifications_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "certifications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "technician_certifications_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_technician_certifications" ("certificate_number", "certification_id", "created_at", "expiry_date", "id", "obtained_date", "status", "technician_id") SELECT "certificate_number", "certification_id", "created_at", "expiry_date", "id", "obtained_date", "status", "technician_id" FROM "technician_certifications";
DROP TABLE "technician_certifications";
ALTER TABLE "new_technician_certifications" RENAME TO "technician_certifications";
CREATE UNIQUE INDEX "technician_certifications_technician_id_certification_id_key" ON "technician_certifications"("technician_id", "certification_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
