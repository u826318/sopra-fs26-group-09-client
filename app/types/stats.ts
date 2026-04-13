export interface DailyBreakdownEntry {
  date: string;
  caloriesConsumed: number;
}

export interface BudgetComparison {
  status: "OVER_BUDGET" | "UNDER_BUDGET" | "ON_TARGET";
  differenceFromTarget: number;
  percentageOfTarget: number;
}

export interface HouseholdStats {
  startDate: string;
  endDate: string;
  dailyCalorieTarget: number | null;
  averageDailyCalories: number;
  totalCaloriesConsumed: number;
  dailyBreakdown: DailyBreakdownEntry[];
  comparisonToBudget: BudgetComparison | null;
}