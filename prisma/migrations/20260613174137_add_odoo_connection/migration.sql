-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "odoo_task_id" INTEGER;

-- CreateTable
CREATE TABLE "odoo_connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "url" TEXT NOT NULL,
    "db" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "api_key_enc" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'project.task',
    "default_project" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_sync_at" DATETIME,
    "last_status" TEXT,
    "last_error" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "odoo_connections_tenant_id_idx" ON "odoo_connections"("tenant_id");
