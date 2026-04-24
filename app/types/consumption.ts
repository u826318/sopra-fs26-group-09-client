/** GET /households/{householdId}/consumption-logs */
export interface ConsumptionLogEntry {
  logId: number;
  consumedAt: string;
  pantryItemId: number;
  productName: string;
  consumedQuantity: number;
  consumedCalories: number;
  userId: number;
  /** Added in the `feature/consumption-log-include-username` server change. Optional for backwards-compat. */
  username?: string;
}
