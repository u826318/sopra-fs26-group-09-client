export interface PantryItemCreateRequest {
  barcode: string;
  name: string;
  quantity: number;
  kcalPerPackage: number;
}

export interface PantryItem extends PantryItemCreateRequest {
  id: number;
  householdId: number;
  count: number;
  addedAt: string;
}

export interface PantryOverview {
  items: PantryItem[];
  totalCalories: number;
}

export interface ConsumePantryItemResponse {
  itemId: number;
  remainingCount: number;
  consumedCalories: number;
  removed: boolean;
}
