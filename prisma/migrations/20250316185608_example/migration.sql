/*
  Warnings:

  - The values [unscheduled] on the enum `CardStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `score` on the `ReviewLog` table. All the data in the column will be lost.
  - You are about to drop the `CardExample` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `rating` to the `ReviewLog` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReviewRating" AS ENUM ('again', 'hard', 'good', 'easy');

-- AlterEnum
BEGIN;
CREATE TYPE "CardStatus_new" AS ENUM ('new', 'learning', 'review', 'mastered');
ALTER TABLE "CardSchedule" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ReviewLog" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "CardSchedule" ALTER COLUMN "status" TYPE "CardStatus_new" USING ("status"::text::"CardStatus_new");
ALTER TABLE "ReviewLog" ALTER COLUMN "state" TYPE "CardStatus_new" USING ("state"::text::"CardStatus_new");
ALTER TYPE "CardStatus" RENAME TO "CardStatus_old";
ALTER TYPE "CardStatus_new" RENAME TO "CardStatus";
DROP TYPE "CardStatus_old";
ALTER TABLE "CardSchedule" ALTER COLUMN "status" SET DEFAULT 'new';
ALTER TABLE "ReviewLog" ALTER COLUMN "state" SET DEFAULT 'review';
COMMIT;

-- DropForeignKey
ALTER TABLE "CardExample" DROP CONSTRAINT "CardExample_card_id_fkey";

-- AlterTable
ALTER TABLE "ReviewLog" DROP COLUMN "score",
ADD COLUMN     "rating" "ReviewRating" NOT NULL;

-- DropTable
DROP TABLE "CardExample";

-- CreateTable
CREATE TABLE "Example" (
    "id" SERIAL NOT NULL,
    "card_id" INTEGER NOT NULL,
    "example_text" TEXT NOT NULL,
    "translation_text" TEXT,
    "tts_audio_url" TEXT,
    "example_order" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Example_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Example_card_id_idx" ON "Example"("card_id");

-- CreateIndex
CREATE UNIQUE INDEX "Example_card_id_example_order_key" ON "Example"("card_id", "example_order");

-- AddForeignKey
ALTER TABLE "Example" ADD CONSTRAINT "Example_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
