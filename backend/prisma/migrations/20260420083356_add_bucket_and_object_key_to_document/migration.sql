/*
  Warnings:

  - You are about to drop the column `filePath` on the `Document` table. All the data in the column will be lost.
  - Added the required column `bucket` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `objectKey` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "filePath",
ADD COLUMN     "bucket" TEXT NOT NULL,
ADD COLUMN     "objectKey" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Document_bucket_objectKey_idx" ON "Document"("bucket", "objectKey");
