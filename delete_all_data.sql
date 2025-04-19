-- Удаление всех данных из базы данных (в правильном порядке)

-- 1. Сначала удаляем записи из таблиц с внешними ключами
TRUNCATE "DailyStats" CASCADE;
TRUNCATE "ReviewLog" CASCADE;
TRUNCATE "Example" CASCADE;
TRUNCATE "CardSchedule" CASCADE;

-- 2. Удаляем основные записи
TRUNCATE "Card" CASCADE;
TRUNCATE "Module" CASCADE;
TRUNCATE "User" CASCADE;
TRUNCATE "Language" CASCADE;

-- 3. Сбрасываем все автоинкрементные последовательности
ALTER SEQUENCE "User_id_seq" RESTART WITH 1;
ALTER SEQUENCE "Language_id_seq" RESTART WITH 1;
ALTER SEQUENCE "Module_id_seq" RESTART WITH 1;
ALTER SEQUENCE "Card_id_seq" RESTART WITH 1;
ALTER SEQUENCE "Example_id_seq" RESTART WITH 1;
ALTER SEQUENCE "ReviewLog_id_seq" RESTART WITH 1;

-- 4. Проверка (опционально)
SELECT 'User' as table_name, COUNT(*) as count FROM "User" UNION ALL
SELECT 'Language', COUNT(*) FROM "Language" UNION ALL
SELECT 'Module', COUNT(*) FROM "Module" UNION ALL
SELECT 'Card', COUNT(*) FROM "Card" UNION ALL
SELECT 'Example', COUNT(*) FROM "Example" UNION ALL
SELECT 'CardSchedule', COUNT(*) FROM "CardSchedule" UNION ALL
SELECT 'ReviewLog', COUNT(*) FROM "ReviewLog" UNION ALL
SELECT 'DailyStats', COUNT(*) FROM "DailyStats";
