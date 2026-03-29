import type { Product } from "@/types/product";

function safeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value, null, 2);
}

function sanitizeFilePart(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "product"
  );
}

export function buildProductExportText(product: Product, context: string): string {
  const lines = [
    context,
    "",
    "Priority fields",
    `Name: ${safeValue(product.name)}`,
    `Barcode: ${safeValue(product.barcode)}`,
    `Brand: ${safeValue(product.brand)}`,
    `Quantity: ${safeValue(product.quantity)}`,
    `Serving size: ${safeValue(product.servingSize)}`,
    `Nutri-Score: ${safeValue(product.nutriScore)}`,
    `Product URL: ${safeValue(product.productUrl)}`,
    `Stores: ${safeValue(product.stores ?? [])}`,
    `Store tags: ${safeValue(product.storeTags ?? [])}`,
    `Purchase places: ${safeValue(product.purchasePlaces ?? [])}`,
    "",
    "Nutrition object",
    JSON.stringify(product.nutriments ?? {}, null, 2),
    "",
    "Nutri-Score computation data",
    JSON.stringify(product.nutriScoreData ?? {}, null, 2),
    "",
    "Full raw return",
    JSON.stringify(product.rawProduct ?? {}, null, 2),
    "",
  ];

  return lines.join("\n");
}

export function exportProductAsText(product: Product, context: string): void {
  const text = buildProductExportText(product, context);
  const fileBase = sanitizeFilePart(
    [product.name ?? "", product.barcode ?? "", "export"].filter(Boolean).join("_"),
  );
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${fileBase}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}