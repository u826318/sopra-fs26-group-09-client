/** GET /households/{householdId}/consumption-logs */
export interface ConsumptionLogEntry {
  logId: number;
  consumedAt: string;
  pantryItemId: number;
  productName: string;
  consumedQuantity: number;
  consumedCalories: number;
  userId: number;
}
