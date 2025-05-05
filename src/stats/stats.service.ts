import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DailyStatItemDto } from './dto/daily-stat-item.dto';
import { StatsFilterDto } from './dto/stats-filter.dto';
import { GlobalProgressDto } from './dto/global-progress.dto';
import { Prisma, CardStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

// --- New DTO Class for weekly stats ---
export class WeeklyGlobalStatItemDto {
  @ApiProperty({ example: '2025-05-05', description: 'Date string (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ example: 5, description: 'Number of reviews contributing to the daily goal' })
  goalReviewsCount: number; // Count reviews contributing to the goal
  
  @ApiProperty({ example: 8, description: 'Total number of any review log entries for the day' })
  anyReviewsCount: number;  // Count any review log entry
}
// --- End New DTO Class ---

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Updated getWeeklyStats for Global Data --- 
  async getWeeklyStats(userId: number): Promise<WeeklyGlobalStatItemDto[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate start date (Monday of the current week)
    const dayOfWeek = (today.getDay() + 6) % 7; // 0=Mon, 1=Tue, ..., 6=Sun
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek);

    // Calculate end date (start of the *next* Monday, exclusive for query range)
    const nextMonday = new Date(startDate);
    nextMonday.setDate(startDate.getDate() + 7);

    console.log(`[StatsService getWeeklyStats] Calculating week from ${startDate.toISOString()} to ${nextMonday.toISOString()}`);

    // Fetch all review logs for the user in the calculated date range
    const reviewLogs = await this.prisma.reviewLog.findMany({
      where: {
        user_id: userId,
        review_date: { gte: startDate, lt: nextMonday }, // Use Monday to next Monday range
      },
      select: {
        review_date: true,
        countsTowardsGoal: true,
      },
    });

    console.log(`[StatsService getWeeklyStats] Found ${reviewLogs.length} review logs for user ${userId} between ${startDate.toISOString()} and ${nextMonday.toISOString()}`);

    // Process logs to count per day
    const dailyCounts = new Map<string, { goalReviewsCount: number; anyReviewsCount: number }>();

    reviewLogs.forEach(log => {
      const dateStr = log.review_date.toISOString().slice(0, 10);
      if (!dailyCounts.has(dateStr)) {
        dailyCounts.set(dateStr, { goalReviewsCount: 0, anyReviewsCount: 0 });
      }
      const counts = dailyCounts.get(dateStr)!;
      counts.anyReviewsCount++;
      if (log.countsTowardsGoal) {
        counts.goalReviewsCount++;
      }
    });

    console.log('[StatsService getWeeklyStats] Daily counts map:', JSON.stringify(Array.from(dailyCounts.entries())));

    // Generate result for the 7 days starting from Monday
    const result: WeeklyGlobalStatItemDto[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate); // Start from Monday
      d.setDate(startDate.getDate() + i); // Get the specific day of the week
      const dateStr = d.toISOString().slice(0, 10);
      const counts = dailyCounts.get(dateStr) || { goalReviewsCount: 0, anyReviewsCount: 0 };
      result.push({ date: dateStr, ...counts });
    }

    return result;
  }
  // --- End Updated getWeeklyStats --- 

  async getDailyStats(userId: number, filter: StatsFilterDto): Promise<DailyStatItemDto[]> {
    const startDate = filter.fromDate ? new Date(filter.fromDate) : (() => { const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d; })();
    const endDate = filter.toDate ? new Date(filter.toDate) : new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    const endExclusive = new Date(endDate);
    endExclusive.setDate(endDate.getDate() + 1);
    endExclusive.setHours(0, 0, 0, 0);

    const where: Prisma.ReviewLogWhereInput = {
      user_id: userId,
      review_date: { gte: startDate, lt: endExclusive },
    };
    if (filter.moduleId) {
      where.card = { module_id: filter.moduleId };
    }

    const dailyLogs = await this.prisma.reviewLog.findMany({ where, select: { review_date: true, state: true, countsTowardsGoal: true, }, orderBy: { review_date: 'asc', }, });
    const logsByDate = new Map<string, { reviewsCount: number; newCount: number; learningCount: number; reviewCount: number; masteredCount: number; }>();
    dailyLogs.forEach(log => {
      const dateStr = log.review_date.toISOString().slice(0, 10);
      if (!logsByDate.has(dateStr)) { logsByDate.set(dateStr, { reviewsCount: 0, newCount: 0, learningCount: 0, reviewCount: 0, masteredCount: 0 }); }
      const stats = logsByDate.get(dateStr)!;
      if (log.countsTowardsGoal) { stats.reviewsCount++; }
      switch (log.state) {
        case CardStatus.new: stats.newCount++; break;
        case CardStatus.learning: stats.learningCount++; break;
        case CardStatus.review: stats.reviewCount++; break;
        case CardStatus.mastered: stats.masteredCount++; break;
      }
    });
    const result: DailyStatItemDto[] = [];
    const currentDate = new Date(startDate);
    while (currentDate < endExclusive) {
      const dateStr = currentDate.toISOString().slice(0, 10);
      const stats = logsByDate.get(dateStr) || { reviewsCount: 0, newCount: 0, learningCount: 0, reviewCount: 0, masteredCount: 0 };
      result.push({ date: dateStr, ...stats });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return result;
  }

  async getSummary(userId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const completedToday = await this.prisma.reviewLog.count({ where: { user_id: userId, countsTowardsGoal: true, review_date: { gte: today, lt: tomorrow } }, });
    return { completedToday };
  }

  async getModulesStats(userId: number) {
    const modules = await this.prisma.module.findMany({ where: { user_id: userId }, select: { id: true, title: true }, });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return Promise.all( modules.map(async m => ({ moduleId: m.id, title: m.title, dueCount: await this.prisma.cardSchedule.count({ where: { card: { module_id: m.id }, due_date: { lt: tomorrow } }, }), })), );
  }

  async getModuleStats(userId: number, moduleId: number) {
    // Note: This uses the old getWeeklyStats logic. Needs update if separate weekly stats per module are needed.
    const weeklyData = await this.prisma.reviewLog.groupBy({ by: ['review_date'], where: { user_id: userId, countsTowardsGoal: true, review_date: { gte: (() => { const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d; })(), lt: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0,0,0,0); return d; })() }, card: { module_id: moduleId } }, _count: { review_date: true }, });
    const counts = new Map<string, number>();
    weeklyData.forEach(item => { counts.set(item.review_date.toISOString().slice(0, 10), item._count.review_date); });
    const weeklyResult: any[] = []; // Replace 'any' with appropriate DTO if defined
    const startDate = (() => { const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d; })();
    for (let i = 0; i < 7; i++) { const d = new Date(startDate); d.setDate(startDate.getDate() + i); const dateStr = d.toISOString().slice(0, 10); weeklyResult.push({ date: dateStr, reviewsCount: counts.get(dateStr) ?? 0 }); }

    return { weekly: weeklyResult, daily: await this.getDailyStats(userId, { moduleId }), };
  }

  async getLearningProgress(userId: number) {
    const grouped = await this.prisma.cardSchedule.groupBy({ by: ['status'], where: { card: { module: { user_id: userId } } }, _count: { status: true }, });
    return grouped.reduce((acc, item) => ({ ...acc, [item.status]: item._count.status }), {} as Record<string, number>);
  }

  // --- Updated getGlobalDailyProgress --- 
  async getGlobalDailyProgress(userId: number): Promise<GlobalProgressDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Get daily goal from user settings
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { dailyGoal: true },
    });
    // Get count of reviews contributing to the goal today
    const completedToday = await this.prisma.reviewLog.count({
      where: { user_id: userId, countsTowardsGoal: true, review_date: { gte: today, lt: tomorrow } },
    });

    // Get all review dates for streak calculation
    const logs = await this.prisma.reviewLog.findMany({
      where: { user_id: userId }, 
      select: { review_date: true },
      // No distinct needed here, we process all logs
    });

    // --- Use Set of Timestamps for Efficient Lookup --- 
    const activityTimestamps = new Set<number>();
    logs.forEach(log => {
        const logDate = new Date(log.review_date);
        logDate.setHours(0, 0, 0, 0); // Normalize to start of day
        activityTimestamps.add(logDate.getTime());
    });
    // Convert Set to sorted array of timestamps for streak calculation
    const sortedTimestamps = Array.from(activityTimestamps).sort((a, b) => a - b);
    // --- End Timestamp Set ---

    let maxStreak = 0;
    let current = 0;
    let prevTimestamp: number | null = null;
    const oneDayMillis = 86400000;

    // Calculate max streak using timestamps
    sortedTimestamps.forEach(timestamp => {
      if (prevTimestamp !== null && timestamp === prevTimestamp + oneDayMillis) {
        current++;
      } else {
        current = 1; // Reset or start streak
      }
      if (current > maxStreak) {
        maxStreak = current;
      }
      prevTimestamp = timestamp;
    });

    // Calculate current streak using timestamps
    let currentStreak = 0;
    for (let i = 0; ; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      // d already has time 00:00:00:000 because `today` was normalized
      const timestampToCheck = d.getTime();
      if (activityTimestamps.has(timestampToCheck)) {
        currentStreak++;
      } else {
        break; // Streak broken
      }
    }

    return { completedToday, currentStreak, maxStreak };
  }
  // --- End Updated getGlobalDailyProgress --- 
}