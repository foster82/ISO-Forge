-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BaseImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "downloadUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_BaseImage" ("createdAt", "filename", "id", "name", "path", "version") SELECT "createdAt", "filename", "id", "name", "path", "version" FROM "BaseImage";
DROP TABLE "BaseImage";
ALTER TABLE "new_BaseImage" RENAME TO "BaseImage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
