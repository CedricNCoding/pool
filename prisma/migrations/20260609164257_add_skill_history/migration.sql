-- CreateTable
CREATE TABLE "technician_skill_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technician_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "user_id" TEXT,
    "recorded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "technician_skill_history_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "technician_skill_history_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "technician_skill_history_technician_id_idx" ON "technician_skill_history"("technician_id");
