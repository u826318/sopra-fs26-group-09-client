// Issue #114 — amount unit chosen by the user when adding an item to the pantry
export type AmountUnit = "g" | "ml" | "package";
export type ConsumptionUnit = AmountUnit | "serving";

export interface PantryItemCreateRequest {
  barcode: string;
  name: string;
  amount: number;
  amountUnit: AmountUnit;
  kcalPerPackage?: number | null;
  kcalPer100g?: number | null;
  kcalPer100ml?: number | null;
}

export interface PantryItem {
  id: number;
  householdId: number;
  barcode: string | null;
  name: string;
  amount: number;
  initialAmount?: number;
  amountUnit: AmountUnit;
  kcalPerPackage?: number | null;
  kcalPer100g?: number | null;
  kcalPer100ml?: number | null;
  nutritionBasisAmount?: number | null;
  nutritionBasisUnit?: AmountUnit | null;
  packageQuantity?: number | null;
  packageQuantityUnit?: AmountUnit | null;
  servingQuantity?: number | null;
  servingQuantityUnit?: AmountUnit | null;
  availableConsumptionUnits?: ConsumptionUnit[] | null;
  addedAt: string;
}

export interface PantryOverview {
  items: PantryItem[];
  totalCalories: number;
}

export interface ConsumePantryItemResponse {
  itemId: number;
  // Issue #133 — remainingAmount (Double) replaces remainingCount (Integer)
  remainingAmount: number;
  consumedCalories: number | null;
  removed: boolean;
}

export interface PortionEstimateResponse {
  status: "ESTIMATED" | "MANUAL_FALLBACK";
  message: string;
  suggestedMinAmount: number | null;
  suggestedMaxAmount: number | null;
  suggestedAmount?: number | null;
  estimatedRange?: string | null;
  unit: AmountUnit | null;
}