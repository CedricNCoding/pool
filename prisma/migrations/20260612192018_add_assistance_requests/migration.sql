-- CreateTable
CREATE TABLE "assistance_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "technician_id" TEXT NOT NULL,
    "requester_user_id" TEXT,
    "requester_company_id" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "admin_note" TEXT,
    "resolved_by_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" DATETIME,
    CONSTRAINT "assistance_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "assistance_requests_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "assistance_requests_requester_company_id_fkey" FOREIGN KEY ("requester_company_id") REFERENCES "companies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "assistance_requests_tenant_id_idx" ON "assistance_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "assistance_requests_technician_id_idx" ON "assistance_requests"("technician_id");
