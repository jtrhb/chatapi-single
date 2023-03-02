-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Conversations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sessionId" TEXT NOT NULL,
    "conversationId" TEXT,
    "messageId" TEXT NOT NULL
);
INSERT INTO "new_Conversations" ("conversationId", "createdAt", "id", "messageId", "sessionId", "updatedAt") SELECT "conversationId", "createdAt", "id", "messageId", "sessionId", "updatedAt" FROM "Conversations";
DROP TABLE "Conversations";
ALTER TABLE "new_Conversations" RENAME TO "Conversations";
CREATE UNIQUE INDEX "Conversations_sessionId_messageId_key" ON "Conversations"("sessionId", "messageId");
CREATE TABLE "new_Result" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "request" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "conversationsId" TEXT,
    "messageId" TEXT NOT NULL,
    "responseTime" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_Result" ("conversationsId", "createdAt", "id", "messageId", "request", "response", "responseTime", "updatedAt") SELECT "conversationsId", "createdAt", "id", "messageId", "request", "response", "responseTime", "updatedAt" FROM "Result";
DROP TABLE "Result";
ALTER TABLE "new_Result" RENAME TO "Result";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
