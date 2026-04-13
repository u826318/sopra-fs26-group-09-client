import type { PantryItemCreateRequest } from "@/types/pantry";
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

export function estimateKcalPerPackage(product: Product): number | null {
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

export function buildPantryItemPayload(
  product: Product,
  quantity: number,
  kcalPerPackage: number,
): PantryItemCreateRequest {
  return {
    barcode: (product.barcode ?? "").trim(),
    name: (product.name ?? "").trim(),
    quantity,
    kcalPerPackage,
  };
}
