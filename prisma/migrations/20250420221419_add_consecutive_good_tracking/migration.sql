-- AlterTable
ALTER TABLE "CardSchedule" ADD COLUMN     "consecutiveGoodCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastAnsweredGoodDate" TIMESTAMP(3);
