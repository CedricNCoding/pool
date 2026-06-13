-- AlterTable
ALTER TABLE "projects" ADD COLUMN "client_contact" TEXT;
ALTER TABLE "projects" ADD COLUMN "client_email" TEXT;
ALTER TABLE "projects" ADD COLUMN "client_phone" TEXT;
ALTER TABLE "projects" ADD COLUMN "dossier_number" TEXT;
ALTER TABLE "projects" ADD COLUMN "required_epi" TEXT;

-- CreateTable
CREATE TABLE "_MissionRequiredCerts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_MissionRequiredCerts_A_fkey" FOREIGN KEY ("A") REFERENCES "certifications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_MissionRequiredCerts_B_fkey" FOREIGN KEY ("B") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_MissionRequiredCerts_AB_unique" ON "_MissionRequiredCerts"("A", "B");

-- CreateIndex
CREATE INDEX "_MissionRequiredCerts_B_index" ON "_MissionRequiredCerts"("B");
