import type { PantryItemCreateRequest } from "@/types/pantry";
import type { Product } from "@/types/product";

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.replace(",", ".").trim();
    if (!normalizedValue) {
      return null;
    }

    const parsedValue = Number(normalizedValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function parsePackageAmount(quantity: string | null):
  | { amount: number; basis: "100g" | "100ml" }
  | null {
  if (!quantity) {
    return null;
  }

  const normalizedQuantity = quantity.toLowerCase().replace(/,/g, ".").trim();

  const multiMatch = normalizedQuantity.match(
    /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g|l|ml)\b/,
  );

  if (multiMatch) {
    const packageCount = Number(multiMatch[1]);
    const unitAmount = Number(multiMatch[2]);
    const unit = multiMatch[3];
    const totalAmount = packageCount * unitAmount;

    if (unit === "kg") {
      return { amount: totalAmount * 1000, basis: "100g" };
    }
    if (unit === "g") {
      return { amount: totalAmount, basis: "100g" };
    }
    if (unit === "l") {
      return { amount: totalAmount * 1000, basis: "100ml" };
    }
    if (unit === "ml") {
      return { amount: totalAmount, basis: "100ml" };
    }
  }

  const singleMatch = normalizedQuantity.match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml)\b/);
  if (!singleMatch) {
    return null;
  }

  const amount = Number(singleMatch[1]);
  const unit = singleMatch[2];

  if (unit === "kg") {
    return { amount: amount * 1000, basis: "100g" };
  }
  if (unit === "g") {
    return { amount, basis: "100g" };
  }
  if (unit === "l") {
    return { amount: amount * 1000, basis: "100ml" };
  }

  return { amount, basis: "100ml" };
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
