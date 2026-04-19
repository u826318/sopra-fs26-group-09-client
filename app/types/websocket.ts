export type PantryEventType = "ITEM_ADDED" | "ITEM_CONSUMED" | "ITEM_REMOVED" | "BULK_ITEMS_ADDED";

export interface PantryItemPayload {
  itemId: number;
  productName: string;
  barcode: string;
  quantity: number;
  unit: string;
  caloriesPerUnit: number;
  addedByUserId: number;
  addedAt: string;
}

export interface PantryUpdateMessage {
  eventType: PantryEventType;
  householdId: number;
  triggeredByUserId: number;
  triggeredByUsername: string;
  timestamp: string;
  item: PantryItemPayload;
  newTotalCalories: number;
}
