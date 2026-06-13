-- AlterTable
ALTER TABLE "projects" ADD COLUMN "address" TEXT;
ALTER TABLE "projects" ADD COLUMN "lat" REAL;
ALTER TABLE "projects" ADD COLUMN "lng" REAL;

-- CreateTable
CREATE TABLE "equipment_packs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "equipment_pack_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT,
    "pack_id" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'outillage',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "equipment_pack_lines_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "equipment_packs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_MissionRequiredTraining" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_MissionRequiredTraining_A_fkey" FOREIGN KEY ("A") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_MissionRequiredTraining_B_fkey" FOREIGN KEY ("B") REFERENCES "training_modules" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "equipment_packs_tenant_id_idx" ON "equipment_packs"("tenant_id");

-- CreateIndex
CREATE INDEX "equipment_pack_lines_tenant_id_idx" ON "equipment_pack_lines"("tenant_id");

-- CreateIndex
CREATE INDEX "equipment_pack_lines_pack_id_idx" ON "equipment_pack_lines"("pack_id");

-- CreateIndex
CREATE UNIQUE INDEX "_MissionRequiredTraining_AB_unique" ON "_MissionRequiredTraining"("A", "B");

-- CreateIndex
CREATE INDEX "_MissionRequiredTraining_B_index" ON "_MissionRequiredTraining"("B");
