-- CreateTable
CREATE TABLE "training_assignment_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignment_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "actor_id" TEXT,
    "actor_name" TEXT,
    "tenant_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "training_assignment_events_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "training_assignments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "training_assignment_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "training_assignment_events_assignment_id_idx" ON "training_assignment_events"("assignment_id");

-- CreateIndex
CREATE INDEX "training_assignment_events_tenant_id_idx" ON "training_assignment_events"("tenant_id");
