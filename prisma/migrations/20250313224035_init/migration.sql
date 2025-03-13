-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('new', 'learning', 'review', 'unscheduled');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "interface_language_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Language" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "language_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" SERIAL NOT NULL,
    "module_id" INTEGER NOT NULL,
    "front_text" TEXT NOT NULL,
    "back_text" TEXT NOT NULL,
    "image_url" TEXT,
    "tts_audio_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardExample" (
    "id" SERIAL NOT NULL,
    "card_id" INTEGER NOT NULL,
    "example_text" TEXT NOT NULL,
    "translation_text" TEXT,
    "tts_audio_url" TEXT,
    "example_order" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CardExample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardSchedule" (
    "card_id" INTEGER NOT NULL,
    "last_review" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "stability" DOUBLE PRECISION,
    "difficulty" DOUBLE PRECISION NOT NULL,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "status" "CardStatus" NOT NULL DEFAULT 'new',

    CONSTRAINT "CardSchedule_pkey" PRIMARY KEY ("card_id")
);

-- CreateTable
CREATE TABLE "ReviewLog" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "card_id" INTEGER NOT NULL,
    "review_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" "CardStatus" NOT NULL DEFAULT 'review',
    "score" INTEGER,
    "next_review_date" TIMESTAMP(3),

    CONSTRAINT "ReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyStats" (
    "user_id" INTEGER NOT NULL,
    "module_id" INTEGER NOT NULL,
    "stat_date" DATE NOT NULL,
    "new_cards" INTEGER NOT NULL DEFAULT 0,
    "repeated_cards" INTEGER NOT NULL DEFAULT 0,
    "learned_cards" INTEGER NOT NULL DEFAULT 0,
    "known_cards" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyStats_pkey" PRIMARY KEY ("user_id","module_id","stat_date")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Language_code_key" ON "Language"("code");

-- CreateIndex
CREATE INDEX "Module_user_id_idx" ON "Module"("user_id");

-- CreateIndex
CREATE INDEX "Module_language_id_idx" ON "Module"("language_id");

-- CreateIndex
CREATE INDEX "Card_module_id_idx" ON "Card"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "Card_module_id_front_text_key" ON "Card"("module_id", "front_text");

-- CreateIndex
CREATE INDEX "CardExample_card_id_idx" ON "CardExample"("card_id");

-- CreateIndex
CREATE UNIQUE INDEX "CardExample_card_id_example_order_key" ON "CardExample"("card_id", "example_order");

-- CreateIndex
CREATE INDEX "CardSchedule_due_date_idx" ON "CardSchedule"("due_date");

-- CreateIndex
CREATE INDEX "ReviewLog_user_id_review_date_idx" ON "ReviewLog"("user_id", "review_date");

-- CreateIndex
CREATE INDEX "ReviewLog_card_id_idx" ON "ReviewLog"("card_id");

-- CreateIndex
CREATE INDEX "ReviewLog_state_idx" ON "ReviewLog"("state");

-- CreateIndex
CREATE INDEX "DailyStats_stat_date_idx" ON "DailyStats"("stat_date");

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardExample" ADD CONSTRAINT "CardExample_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardSchedule" ADD CONSTRAINT "CardSchedule_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyStats" ADD CONSTRAINT "DailyStats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyStats" ADD CONSTRAINT "DailyStats_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
