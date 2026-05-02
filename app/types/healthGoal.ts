export type GoalType = "LOSE_WEIGHT" | "MAINTAIN" | "GAIN_MUSCLE";
export type Sex = "MALE" | "FEMALE" | "OTHER";
export type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";

export interface HealthGoal {
  goalId: number;
  userId: number;
  goalType: GoalType;
  targetRate: number | null;
  age: number;
  sex: Sex;
  height: number;
  weight: number;
  activityLevel: ActivityLevel;
  recommendedDailyCalories: number;
  updatedAt: string;
}

export interface HealthGoalPutRequest {
  goalType: GoalType;
  targetRate?: number | null;
  age: number;
  sex: Sex;
  height: number;
  weight: number;
  activityLevel: ActivityLevel;
}
