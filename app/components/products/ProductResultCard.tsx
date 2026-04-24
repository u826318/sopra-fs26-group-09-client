"use client";

import React, { useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import type { PantryItem } from "@/types/pantry";
import type { Product } from "@/types/product";
import { buildPantryItemPayload, estimateKcalPerPackage } from "@/utils/pantry";
import { Card, Image } from "antd";
import styles from "@/styles/productResultCard.module.css";

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
}: {
  product: Product;
  label?: string;
  rawTitle: string;
  exportContext: string;
  pantryContext?: PantryContext;
}) {
  const api = useApi();
  const estimatedKcal = useMemo(() => estimateKcalPerPackage(product), [product]);
  const isLocalFallback = product.localFallback === true || product.dataSource === "local_csv_fallback";
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
      setSuccessMessage(`Item successfully added to ${getPantryTargetLabel(effectivePantryContext)}.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to add the product to the pantry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={styles.resultCard} styles={{ body: { padding: 24 } }}>
      <div
        className={`${styles.resultBody} ${product.imageUrl ? "" : styles.resultBodyNoImage}`.trim()}
      >
        {product.imageUrl ? (
          <div className={styles.imagePanel}>
            <Image
              src={product.imageUrl}
              alt={product.name ?? "Product image"}
              preview={false}
              width={260}
              className={styles.image}
            />
          </div>
        ) : null}

        <div className={styles.content}>
          <div className={styles.headerBlock}>
            <div className={styles.headerRow}>
              <div className={styles.eyebrow}>Top match</div>
              {isLocalFallback ? (
                <span className={styles.sourceBadge}>From Local Dataset</span>
              ) : (
                <span className={styles.sourceBadgeSecondary}>Open Food Facts API</span>
              )}
            </div>
            <div className={styles.productName}>{product.name ?? "Unknown product"}</div>
          </div>

          <div className={styles.metaGrid}>
            <div className={styles.metaCard}>
              <div className={styles.metaLabel}>Brand</div>
              <div className={styles.metaValue}>{product.brand?.trim() || "—"}</div>
            </div>
            <div className={styles.metaCard}>
              <div className={styles.metaLabel}>Barcode</div>
              <div className={styles.metaValue}>{product.barcode?.trim() || "—"}</div>
            </div>
            <div className={styles.metaCard}>
              <div className={styles.metaLabel}>Estimated kcal / package</div>
              <div className={styles.metaValue}>{estimatedKcal ?? "—"}</div>
            </div>
            <div className={styles.metaCard}>
              <div className={styles.metaLabel}>Data source</div>
              <div className={styles.metaValue}>
                {isLocalFallback ? "Local fallback" : "Open Food Facts"}
              </div>
            </div>
          </div>

          <div className={styles.actionPanel}>
            <div className={styles.actionHeading}>Add this item to pantry</div>
            <div className={styles.actionSubtext}>
              Review the product details, choose the number of packages, then save the item to the current household pantry.
            </div>

            <div className={styles.controls}>
              <label className={styles.quantityField}>
                <span className={styles.quantityLabel}>Quantity to add</span>
                <input
                  aria-label="Quantity to add"
                  type="number"
                  min={1}
                  step={1}
                  value={packageCount}
                  onChange={(event) => setPackageCount(Number(event.target.value))}
                  className={styles.quantityInput}
                />
              </label>

              <button
                type="button"
                onClick={() => void handleAddToPantry()}
                disabled={isSubmitting}
                className={styles.addButton}
              >
                {isSubmitting ? "Adding..." : "Add to pantry"}
              </button>
            </div>

            {successMessage ? (
              <div role="status" className={styles.successMessage}>
                {successMessage}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
