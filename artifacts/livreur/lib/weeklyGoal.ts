import { storage } from "@/lib/storage";

const WEEKLY_GOAL_KEY = "jatek_weekly_goal";
const DEFAULT_GOAL = 1500;

export async function getWeeklyGoal(): Promise<number> {
  try {
    const stored = await storage.getItemAsync(WEEKLY_GOAL_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_GOAL;
}

export async function setWeeklyGoal(value: number): Promise<void> {
  await storage.setItemAsync(WEEKLY_GOAL_KEY, String(value));
}

export const WEEKLY_GOAL_PRESETS = [800, 1500, 2500, 4000];
