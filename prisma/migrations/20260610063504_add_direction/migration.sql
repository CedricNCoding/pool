-- CreateTable
CREATE TABLE "skill_objectives" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "skill_id" TEXT,
    "min_level" INTEGER NOT NULL DEFAULT 3,
    "target_percent" INTEGER NOT NULL DEFAULT 80,
    "deadline" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "skill_objectives_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_training_modules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration_hours" INTEGER,
    "cost_eur" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_training_modules" ("created_at", "description", "duration_hours", "id", "title", "updated_at") SELECT "created_at", "description", "duration_hours", "id", "title", "updated_at" FROM "training_modules";
DROP TABLE "training_modules";
ALTER TABLE "new_training_modules" RENAME TO "training_modules";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
