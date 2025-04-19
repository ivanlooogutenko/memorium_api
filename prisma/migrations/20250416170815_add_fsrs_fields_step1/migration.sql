/*
  Warnings:

  - Made the column `stability` on table `CardSchedule` required. This step will fail if there are existing NULL values in that column.

*/
-- Step 1: Update existing NULL values in stability to 0
UPDATE "CardSchedule" SET "stability" = 0 WHERE "stability" IS NULL;

-- Step 2: Alter the table to make stability NOT NULL and set defaults
-- AlterTable
ALTER TABLE "CardSchedule" 
  ALTER COLUMN "stability" SET NOT NULL,
  ALTER COLUMN "stability" SET DEFAULT 0,
  ALTER COLUMN "difficulty" SET DEFAULT 0;

-- Step 3: Add fsrsParams column to User table
-- AlterTable
ALTER TABLE "User" ADD COLUMN "fsrsParams" JSONB DEFAULT '{}';
