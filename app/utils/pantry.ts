import type { AmountUnit, PantryItemCreateRequest } from "@/types/pantry";
import type { Product } from "@/types/product";

type QuantityUnit = "kg" | "g" | "l" | "ml";

type ParsedPackageAmount = {
  amount: number;
  basis: "100g" | "100ml";
};

type ParsedUnitAmount = {
  amount: number;
  unit: QuantityUnit;
};

const UNIT_SUFFIXES: QuantityUnit[] = ["kg", "ml", "g", "l"];

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.replaceAll(",", ".").trim();
    if (!normalizedValue) {
      return null;
    }

    const parsedValue = Number(normalizedValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function parseUnitAmount(value: string): ParsedUnitAmount | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const detectedUnit = UNIT_SUFFIXES.find((unit) => trimmedValue.endsWith(unit));
  if (!detectedUnit) {
    return null;
  }

  const numericText = trimmedValue.slice(0, -detectedUnit.length).trim();
  const amount = parseNumber(numericText);
  if (amount === null) {
    return null;
  }

  return {
    amount,
    unit: detectedUnit,
  };
}

function toAmountBasis(amount: number, unit: QuantityUnit): ParsedPackageAmount {
  switch (unit) {
    case "kg":
      return { amount: amount * 1000, basis: "100g" };
    case "g":
      return { amount, basis: "100g" };
    case "l":
      return { amount: amount * 1000, basis: "100ml" };
    case "ml":
      return { amount, basis: "100ml" };
  }
}

function parsePackageAmount(quantity: string | null): ParsedPackageAmount | null {
  if (!quantity) {
    return null;
  }

  const normalizedQuantity = quantity.toLowerCase().replaceAll(",", ".").trim();
  const multiSeparatorIndex = Math.max(
    normalizedQuantity.indexOf("x"),
    normalizedQuantity.indexOf("×"),
  );

  if (multiSeparatorIndex > 0) {
    const packageCountText = normalizedQuantity.slice(0, multiSeparatorIndex).trim();
    const remainingText = normalizedQuantity.slice(multiSeparatorIndex + 1).trim();
    const packageCount = parseNumber(packageCountText);
    const unitAmount = parseUnitAmount(remainingText);

    if (packageCount !== null && unitAmount) {
      return toAmountBasis(packageCount * unitAmount.amount, unitAmount.unit);
    }
  }

  const singleAmount = parseUnitAmount(normalizedQuantity);
  return singleAmount ? toAmountBasis(singleAmount.amount, singleAmount.unit) : null;
}

function packageAmountFromLocalDataset(product: Product): ParsedPackageAmount | null {
  const amount = parseNumber(product.packageQuantity);
  const unit = product.packageQuantityUnit?.toLowerCase().trim();

  if (amount === null || !unit) {
    return null;
  }

  if (unit === "g" || unit === "kg" || unit === "ml" || unit === "l") {
    return toAmountBasis(amount, unit as QuantityUnit);
  }

  return null;
}

function getPackageAmount(product: Product): ParsedPackageAmount | null {
  return packageAmountFromLocalDataset(product) ?? parsePackageAmount(product.quantity);
}

function readLocalEnergyPer100(product: Product): number | null {
  return parseNumber(product.nutrition?.coreNutrition?.["energy-kcal"]?.value);
}

export function estimateKcalPerPackage(product: Product): number | null {
  const localEnergyPer100 = readLocalEnergyPer100(product);
  const localAmountInfo = packageAmountFromLocalDataset(product);

  if (localEnergyPer100 !== null && localAmountInfo) {
    const estimatedCalories = (localEnergyPer100 * localAmountInfo.amount) / 100;
    return Number(estimatedCalories.toFixed(2));
  }

  const nutriments = product.nutriments ?? {};
  const amountInfo = parsePackageAmount(product.quantity);

  if (amountInfo) {
    const baseValue =
      amountInfo.basis === "100g"
        ? parseNumber(nutriments["energy-kcal_100g"])
        : parseNumber(nutriments["energy-kcal_100ml"]);

    if (baseValue !== null) {
      const estimatedCalories = (baseValue * amountInfo.amount) / 100;
      return Number(estimatedCalories.toFixed(2));
    }
  }

  const servingValue = parseNumber(nutriments["energy-kcal_serving"]);
  if (servingValue !== null) {
    return Number(servingValue.toFixed(2));
  }

  const fallback100g = parseNumber(nutriments["energy-kcal_100g"]);
  if (fallback100g !== null) {
    return Number(fallback100g.toFixed(2));
  }

  const fallback100ml = parseNumber(nutriments["energy-kcal_100ml"]);
  if (fallback100ml !== null) {
    return Number(fallback100ml.toFixed(2));
  }

  return null;
}

// Issue #95 — "package" or unknown keeps × suffix; g/ml use the unit as suffix
export function formatQuantity(quantity: number, unit: AmountUnit | undefined): string {
  if (unit === "g" || unit === "ml") return `${quantity}${unit}`;
  return `${quantity}×`;
}

// Add-to-pantry is still package-count based on the backend.
// Grams/ml/servings should be introduced in the later consume flow, not here.
export function detectAvailableUnits(_product: Product): AmountUnit[] {
  return ["package"];
}

// Package → 1. Later consume UI can use grams/ml/servings defaults.
export function getDefaultAmount(_product: Product, _unit: AmountUnit): number {
  return 1;
}

// Issue #114 — extract per-100g kcal value from product data
export function getKcalPer100g(product: Product): number | null {
  if (product.nutrition?.basisUnit === "g") {
    return readLocalEnergyPer100(product);
  }

  return parseNumber((product.nutriments ?? {})["energy-kcal_100g"]);
}

// Issue #114 — extract per-100ml kcal value from product data
export function getKcalPer100ml(product: Product): number | null {
  if (product.nutrition?.basisUnit === "ml") {
    return readLocalEnergyPer100(product);
  }

  return parseNumber((product.nutriments ?? {})["energy-kcal_100ml"]);
}

// Add-to-pantry now lets the backend source all trusted product details from the local dataset.
// The backend only needs barcode + quantity for this Path A snapshot flow.
export function buildPantryItemPayload(
  product: Product,
  amount: number,
  _unit: AmountUnit,
): PantryItemCreateRequest {
  return {
    barcode: (product.barcode ?? "").trim(),
    quantity: amount,
  };
}

export function getDisplayQuantity(product: Product): string | null {
  if (product.productQuantity && product.productQuantityUnit) {
    return `${product.productQuantity}${product.productQuantityUnit}`;
  }

  const amountInfo = getPackageAmount(product);
  if (amountInfo) {
    return amountInfo.basis === "100g" ? `${amountInfo.amount}g` : `${amountInfo.amount}ml`;
  }

  return product.quantity;
}
