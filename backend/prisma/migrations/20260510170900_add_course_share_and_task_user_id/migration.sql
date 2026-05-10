-- AlterTable - Add userId to Task table
ALTER TABLE "Task" ADD COLUMN "userId" TEXT;

-- Update existing tasks to have the course owner as userId
UPDATE "Task" t
SET "userId" = c."ownerId"
FROM "Course" c
WHERE t."courseId" = c."id" AND t."userId" IS NULL;

-- Now make the column NOT NULL
ALTER TABLE "Task" ALTER COLUMN "userId" SET NOT NULL;

-- Add foreign key constraint for userId
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex for userId
CREATE INDEX "Task_userId_idx" ON "Task"("userId");

-- CreateIndex for courseId and userId combination
CREATE INDEX "Task_courseId_userId_idx" ON "Task"("courseId", "userId");

-- CreateTable CourseShare
CREATE TABLE "CourseShare" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sharedWithUserId" TEXT NOT NULL,
    "sharedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseShare_courseId_sharedWithUserId_key" ON "CourseShare"("courseId", "sharedWithUserId");

-- CreateIndex
CREATE INDEX "CourseShare_courseId_idx" ON "CourseShare"("courseId");

-- CreateIndex
CREATE INDEX "CourseShare_sharedWithUserId_idx" ON "CourseShare"("sharedWithUserId");

-- CreateIndex
CREATE INDEX "CourseShare_sharedByUserId_idx" ON "CourseShare"("sharedByUserId");

-- AddForeignKey
ALTER TABLE "CourseShare" ADD CONSTRAINT "CourseShare_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseShare" ADD CONSTRAINT "CourseShare_sharedWithUserId_fkey" FOREIGN KEY ("sharedWithUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseShare" ADD CONSTRAINT "CourseShare_sharedByUserId_fkey" FOREIGN KEY ("sharedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;