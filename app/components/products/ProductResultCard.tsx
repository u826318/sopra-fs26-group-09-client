"use client";

import React, { useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import type { PantryItem } from "@/types/pantry";
import type { Product } from "@/types/product";
import { buildPantryItemPayload, estimateKcalPerPackage } from "@/utils/pantry";
import { Card, Image } from "antd";

type PantryContext = {
  householdId: number;
  householdName?: string;
};

function getPantryTargetLabel(pantryContext: PantryContext): string {
  return pantryContext.householdName?.trim() || `household ${pantryContext.householdId}`;
}

function readPantryContextFromUrl(): PantryContext | undefined {
  if (typeof globalThis.window === "undefined") {
    return undefined;
  }

  const params = new URLSearchParams(globalThis.location.search);
  const householdId = Number(params.get("householdId"));
  if (!Number.isFinite(householdId) || householdId <= 0) {
    return undefined;
  }

  const householdName = params.get("householdName")?.trim();
  return {
    householdId,
    householdName: householdName || undefined,
  };
}

export default function ProductResultCard({
  product,
  pantryContext,
  onPantryItemAdded,
}: {
  product: Product;
  label?: string;
  rawTitle: string;
  exportContext: string;
  pantryContext?: PantryContext;
  onPantryItemAdded?: (item: PantryItem) => void;
}) {
  const api = useApi();
  const estimatedKcal = useMemo(() => estimateKcalPerPackage(product), [product]);
  const effectivePantryContext = useMemo(
    () => pantryContext ?? readPantryContextFromUrl(),
    [pantryContext],
  );

  const [packageCount, setPackageCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleAddToPantry = async (): Promise<void> => {
    if (!effectivePantryContext) {
      alert("No pantry target is selected.");
      return;
    }

    const barcode = product.barcode?.trim() ?? "";
    if (!barcode) {
      alert("This product does not have a usable barcode.");
      return;
    }

    const productName = product.name?.trim() ?? "";
    if (!productName) {
      alert("This product does not have a usable name.");
      return;
    }

    if (!Number.isInteger(packageCount) || packageCount < 1) {
      alert("Quantity to add must be at least 1.");
      return;
    }

    if (estimatedKcal === null) {
      alert("Calories per package could not be estimated for this product.");
      return;
    }

    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const payload = buildPantryItemPayload(product, packageCount, estimatedKcal);
      const createdItem = await api.post<PantryItem>(
        `/households/${effectivePantryContext.householdId}/pantry`,
        payload,
      );
      onPantryItemAdded?.(createdItem);
      setSuccessMessage(`Item successfully added to ${getPantryTargetLabel(effectivePantryContext)}.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to add the product to the pantry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card style={{ width: "100%", borderRadius: 24 }} bodyStyle={{ padding: 24 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: product.imageUrl ? "minmax(220px, 320px) minmax(320px, 1fr)" : "1fr",
          gap: 32,
          alignItems: "start",
        }}
      >
        {product.imageUrl ? (
          <div
            style={{
              border: "1px solid #d9d0c6",
              borderRadius: 32,
              background: "#f5f2ed",
              minHeight: 280,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 18,
            }}
          >
            <Image
              src={product.imageUrl}
              alt={product.name ?? "Product image"}
              preview={false}
              width={276}
              style={{ objectFit: "contain", maxWidth: "100%", maxHeight: 240 }}
            />
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 22 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 28, lineHeight: 1.2, fontWeight: 700 }}>
              {product.name ?? "Unknown product"}
            </div>
            <div style={{ fontSize: 24, lineHeight: 1.35 }}>
              Brand: {product.brand?.trim() || "—"}
            </div>
            <div style={{ fontSize: 24, lineHeight: 1.35 }}>
              Barcode: {product.barcode?.trim() || "—"}
            </div>
            <div style={{ fontSize: 24, lineHeight: 1.35 }}>
              kcal / package (est.): {estimatedKcal ?? "—"}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
            <div
              style={{
                display: "flex",
                gap: 14,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 22,
                  lineHeight: 1.3,
                }}
              >
                <span>Quantity to add:</span>
                <input
                  aria-label="Quantity to add"
                  type="number"
                  min={1}
                  step={1}
                  value={packageCount}
                  onChange={(event) => setPackageCount(Number(event.target.value))}
                  style={{
                    width: 160,
                    height: 54,
                    borderRadius: 999,
                    border: "1px solid #d9d0c6",
                    padding: "0 18px",
                    fontSize: 22,
                    background: "#ffffff",
                  }}
                />
              </label>

              <button
                type="button"
                onClick={() => void handleAddToPantry()}
                disabled={isSubmitting}
                style={{
                  border: "none",
                  borderRadius: 999,
                  padding: "0 32px",
                  minHeight: 74,
                  fontSize: 22,
                  color: "#ffffff",
                  background: isSubmitting ? "#74a87f" : "#106832",
                  cursor: isSubmitting ? "progress" : "pointer",
                }}
              >
                {isSubmitting ? "Adding..." : "Add to pantry"}
              </button>
            </div>

            {successMessage ? (
              <div
                role="status"
                style={{
                  fontSize: 18,
                  lineHeight: 1.4,
                  color: "#106832",
                  marginLeft: 2,
                }}
              >
                {successMessage}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
