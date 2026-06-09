-- CreateTable
CREATE TABLE "training_modules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration_hours" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "training_paths" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "training_path_modules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "training_path_modules_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "training_paths" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "training_path_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "training_modules" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "training_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technician_id" TEXT NOT NULL,
    "module_id" TEXT,
    "path_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'propose',
    "note" TEXT,
    "assigned_by_id" TEXT,
    "validated_by_id" TEXT,
    "validated_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "training_assignments_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "training_assignments_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "training_modules" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "training_assignments_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "training_paths" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_SkillToTrainingModule" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_SkillToTrainingModule_A_fkey" FOREIGN KEY ("A") REFERENCES "skills" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_SkillToTrainingModule_B_fkey" FOREIGN KEY ("B") REFERENCES "training_modules" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_SkillToTrainingModule_AB_unique" ON "_SkillToTrainingModule"("A", "B");

-- CreateIndex
CREATE INDEX "_SkillToTrainingModule_B_index" ON "_SkillToTrainingModule"("B");
