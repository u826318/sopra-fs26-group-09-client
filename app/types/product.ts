export type LocalDatasetNutrientAmount = {
  value: number;
  unit: string;
};

export type LocalDatasetNutrition = {
  basisAmount: number | null;
  basisUnit: "g" | "ml" | string | null;
  coreNutrition: Record<string, LocalDatasetNutrientAmount>;
  micronutrients: Record<string, LocalDatasetNutrientAmount>;
};

export type LocalDatasetConsumptionOption = {
  type: "GRAMS" | "MILLILITERS" | "PACKAGE" | "SERVINGS" | string;
  label: string;
  unit: string;
};

export interface Product {
  barcode: string | null;
  name: string | null;
  brand: string | null;

  // Legacy Open Food Facts quantity fields.
  quantity: string | null;
  servingSize: string | null;

  imageUrl: string | null;
  productUrl: string | null;
  nutriScore: string | null;
  localFallback?: boolean | null;
  dataSource?: string | null;
  caloriesPerPackage?: number | null;
  stores: string[] | null;
  storeTags: string[] | null;
  purchasePlaces: string[] | null;
  nutriments: Record<string, unknown> | null;
  nutriScoreData: Record<string, unknown> | null;
  rawProduct: Record<string, unknown> | null;

  // LocalDatasetProductDTO fields.
  productIndex?: number | null;
  productQuantity?: string | null;
  productQuantityUnit?: string | null;
  packageQuantity?: number | null;
  packageQuantityUnit?: string | null;
  servingQuantity?: number | null;
  servingQuantityUnit?: string | null;
  nutrition?: LocalDatasetNutrition | null;
  consumptionOptions?: LocalDatasetConsumptionOption[] | null;
}
