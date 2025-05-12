/*
  Warnings:

  - You are about to drop the column `image_url` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `tts_audio_url` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `tts_audio_url` on the `Example` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Card" DROP COLUMN "image_url",
DROP COLUMN "tts_audio_url";

-- AlterTable
ALTER TABLE "Example" DROP COLUMN "tts_audio_url";
