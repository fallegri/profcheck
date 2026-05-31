-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "googleId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "googleFolderId" TEXT,
    "googleFolderUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "futureInfo" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventProfession" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "professionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventProfession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorSession" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorSelection" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "professionId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitorSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_googleId_idx" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "Event_adminId_idx" ON "Event"("adminId");

-- CreateIndex
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Profession_name_key" ON "Profession"("name");

-- CreateIndex
CREATE INDEX "Profession_name_idx" ON "Profession"("name");

-- CreateIndex
CREATE INDEX "EventProfession_eventId_idx" ON "EventProfession"("eventId");

-- CreateIndex
CREATE INDEX "EventProfession_professionId_idx" ON "EventProfession"("professionId");

-- CreateIndex
CREATE UNIQUE INDEX "EventProfession_eventId_professionId_key" ON "EventProfession"("eventId", "professionId");

-- CreateIndex
CREATE UNIQUE INDEX "VisitorSession_sessionToken_key" ON "VisitorSession"("sessionToken");

-- CreateIndex
CREATE INDEX "VisitorSession_eventId_idx" ON "VisitorSession"("eventId");

-- CreateIndex
CREATE INDEX "VisitorSession_sessionToken_idx" ON "VisitorSession"("sessionToken");

-- CreateIndex
CREATE INDEX "VisitorSession_expiresAt_idx" ON "VisitorSession"("expiresAt");

-- CreateIndex
CREATE INDEX "VisitorSelection_eventId_idx" ON "VisitorSelection"("eventId");

-- CreateIndex
CREATE INDEX "VisitorSelection_professionId_idx" ON "VisitorSelection"("professionId");

-- CreateIndex
CREATE INDEX "VisitorSelection_sessionId_idx" ON "VisitorSelection"("sessionId");

-- CreateIndex
CREATE INDEX "VisitorSelection_timestamp_idx" ON "VisitorSelection"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "VisitorSelection_eventId_professionId_sessionId_timestamp_key" ON "VisitorSelection"("eventId", "professionId", "sessionId", "timestamp");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventProfession" ADD CONSTRAINT "EventProfession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventProfession" ADD CONSTRAINT "EventProfession_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "Profession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorSession" ADD CONSTRAINT "VisitorSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorSelection" ADD CONSTRAINT "VisitorSelection_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorSelection" ADD CONSTRAINT "VisitorSelection_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "Profession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorSelection" ADD CONSTRAINT "VisitorSelection_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisitorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
