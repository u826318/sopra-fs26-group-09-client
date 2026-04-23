"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import type { Product } from "@/types/product";
import ProductResultCard from "@/components/products/ProductResultCard";
import { Button, Card, Empty, Input, Space, Typography } from "antd";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { VirtualPantryAppShell } from "@/components/VirtualPantryAppShell";
import styles from "@/styles/openFoodFacts.module.css";

const { Title, Paragraph } = Typography;

type PantryTarget = {
  householdId: number;
  householdName?: string;
};

export default function OpenFoodFactsPortalPage() {
  useAuthGuard();
  const api = useApi();
  const router = useRouter();
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<Product | null>(null);
  const [lookupMessage, setLookupMessage] = useState("");
  const [hasAutoLookedUp, setHasAutoLookedUp] = useState(false);

  const pantryTarget = useMemo<PantryTarget | null>(() => {
    if (typeof globalThis.window === "undefined") {
      return null;
    }

    const params = new URLSearchParams(globalThis.location.search);
    const householdId = Number(params.get("householdId"));
    if (!Number.isFinite(householdId) || householdId <= 0) {
      return null;
    }

    return {
      householdId,
      householdName: params.get("householdName") ?? undefined,
    };
  }, []);

  const lookupBarcode = async (barcodeValue: string) => {
    const barcodeToLookup = barcodeValue.trim();
    if (!barcodeToLookup) {
      alert("Please enter a barcode first.");
      return;
    }

    setLookupMessage("");
    setLoading(true);
    try {
      const result = await api.get<Product>(
        `/products/lookup?barcode=${encodeURIComponent(barcodeToLookup)}`,
      );
      setBarcodeResult(result);
      setBarcode(barcodeToLookup);
      setLookupMessage("");
    } catch (_error) {
      setBarcodeResult(null);
      setLookupMessage("Cannot find the item using the barcode.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof globalThis.window === "undefined" || hasAutoLookedUp) {
      return;
    }

    const params = new URLSearchParams(globalThis.location.search);
    const barcodeFromQuery = params.get("barcode")?.trim();

    if (!barcodeFromQuery) {
      return;
    }

    setHasAutoLookedUp(true);
    setBarcode(barcodeFromQuery);
    void lookupBarcode(barcodeFromQuery);
  }, [hasAutoLookedUp]);

  return (
    <VirtualPantryAppShell activeNav="pantry">
      <header className={styles.pageHeader}>
        <Title level={1} className={styles.pageTitle}>
          Product Lookup Portal
        </Title>
        <Paragraph className={styles.pageSubtitle}>
          Search Open Food Facts by barcode and add matching products straight into your pantry flow.
        </Paragraph>
      </header>

      <Card className={styles.contextCard}>
        <div className={styles.contextLabel}>Current flow</div>
        <div className={styles.contextValue}>
          {pantryTarget?.householdName?.trim() || "Direct product lookup"}
        </div>
        <p className={styles.contextNote}>
          {pantryTarget
            ? `Products found here can be added directly to household ${pantryTarget.householdId}.`
            : "Look up a barcode first, then review the returned product details below."}
        </p>
      </Card>

      <Card title="Barcode lookup" className={styles.sectionCard}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div className={styles.lookupStack}>
            <label className={styles.lookupLabel}>
              <span>Barcode</span>
              <Input
                value={barcode}
                onChange={(event) => {
                  setBarcode(event.target.value);
                  if (lookupMessage) {
                    setLookupMessage("");
                  }
                }}
                onPressEnter={() => void lookupBarcode(barcode)}
                placeholder="e.g. 3017624010701"
              />
            </label>

            <div className={styles.lookupActions}>
              <Button
                className={styles.secondaryBtn}
                onClick={() => router.push("/stats")}
              >
                Back to household page
              </Button>
              <Button
                type="primary"
                className={styles.primaryBtn}
                onClick={() => void lookupBarcode(barcode)}
                loading={loading}
              >
                {loading ? "Looking up..." : "Look up barcode"}
              </Button>
            </div>
          </div>

          {lookupMessage ? (
            <div role="alert" className={styles.inlineError}>
              {lookupMessage}
            </div>
          ) : null}
        </Space>
      </Card>

      <section className={styles.resultSection}>
        {barcodeResult ? (
          <ProductResultCard
            product={barcodeResult}
            rawTitle=""
            exportContext="Product lookup"
            pantryContext={pantryTarget ?? undefined}
          />
        ) : lookupMessage ? null : (
          <div className={styles.emptyState}>
            <Empty description="No product loaded yet." />
          </div>
        )}
      </section>
    </VirtualPantryAppShell>
  );
}
