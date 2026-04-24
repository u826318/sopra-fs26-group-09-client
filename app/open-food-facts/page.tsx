"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import type { Product } from "@/types/product";
import ProductResultCard from "@/components/products/ProductResultCard";
import { App, Button, Card, Empty, Input, Space, Typography } from "antd";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { VirtualPantryAppShell } from "@/components/VirtualPantryAppShell";
import styles from "@/styles/openFoodFacts.module.css";

const { Title, Paragraph } = Typography;

type PantryTarget = {
  householdId: number;
  householdName?: string;
};

function formatHouseholdValidationError(error: unknown): string {
  if (error instanceof Error && error.message.includes("User is not a member")) {
    return "You are not a member of this household.";
  }

  return "Household ID does not exist.";
}

type HouseholdLookup = {
  householdId: number;
  name: string;
};

export default function OpenFoodFactsPortalPage() {
  return (
    <Suspense fallback={null}>
      <OpenFoodFactsPortalContent />
    </Suspense>
  );
}

function OpenFoodFactsPortalContent() {
  useAuthGuard();
  const api = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<Product | null>(null);
  const [lookupMessage, setLookupMessage] = useState("");
  const [hasAutoLookedUp, setHasAutoLookedUp] = useState(false);
  const [validatedPantryTarget, setValidatedPantryTarget] = useState<PantryTarget | null>(null);
  const [validatingPantryTarget, setValidatingPantryTarget] = useState(true);

  const requestedPantryTarget = useMemo<PantryTarget | null>(() => {
    const householdIdParam = searchParams.get("householdId");
    if (householdIdParam === null) {
      return null;
    }

    const householdId = Number(householdIdParam);
    if (!Number.isInteger(householdId) || householdId <= 0) {
      return null;
    }

    return {
      householdId,
      householdName: searchParams.get("householdName") ?? undefined,
    };
  }, [searchParams]);

  const invalidPantryTargetMessage = useMemo(() => {
    const householdIdParam = searchParams.get("householdId");
    const householdNameParam = searchParams.get("householdName");

    if (householdIdParam === null) {
      return householdNameParam
        ? "Household ID is required when a household name is provided."
        : "";
    }

    const householdId = Number(householdIdParam);
    return Number.isInteger(householdId) && householdId > 0
      ? ""
      : "Household ID is invalid.";
  }, [searchParams]);

  const pantryTarget = validatedPantryTarget;

  useEffect(() => {
    let cancelled = false;

    const rejectInvalidTarget = (text: string) => {
      if (cancelled) {
        return;
      }

      setValidatedPantryTarget(null);
      setValidatingPantryTarget(false);
      message.error(text);

      if (globalThis.window.history.length > 1) {
        router.back();
      } else {
        router.replace("/households");
      }
    };

    const validatePantryTarget = async () => {
      if (invalidPantryTargetMessage) {
        rejectInvalidTarget(invalidPantryTargetMessage);
        return;
      }

      if (!requestedPantryTarget) {
        setValidatedPantryTarget(null);
        setValidatingPantryTarget(false);
        return;
      }

      setValidatingPantryTarget(true);
      try {
        const household = await api.get<HouseholdLookup>(
          `/households/${requestedPantryTarget.householdId}`,
        );

        if (cancelled) {
          return;
        }

        const requestedName = requestedPantryTarget.householdName?.trim();
        if (requestedName && requestedName !== household.name) {
          rejectInvalidTarget("Household name does not exist for this household.");
          return;
        }

        setValidatedPantryTarget({
          householdId: requestedPantryTarget.householdId,
          householdName: household.name,
        });
        setValidatingPantryTarget(false);
      } catch (error) {
        rejectInvalidTarget(formatHouseholdValidationError(error));
      }
    };

    void validatePantryTarget();

    return () => {
      cancelled = true;
    };
  }, [api, invalidPantryTargetMessage, message, requestedPantryTarget, router]);

  const backToPantryStats = useCallback(() => {
    const householdId = Number(searchParams.get("householdId"));
    if (Number.isFinite(householdId) && householdId > 0) {
      router.push(`/households/${householdId}/stats`);
      return;
    }

    router.push("/households");
  }, [router, searchParams]);

  const lookupBarcode = useCallback(async (barcodeValue: string) => {
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
    } catch {
      setBarcodeResult(null);
      setLookupMessage("Cannot find the item using the barcode.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  // This useEffect is used by pantry/add/scan. Wait until the household target is validated
  // so an invalid household URL cannot render product results or create an add-to-pantry flow.
  useEffect(() => {
    if (validatingPantryTarget || hasAutoLookedUp) {
      return;
    }

    if (requestedPantryTarget && !validatedPantryTarget) {
      return;
    }

    const barcodeFromQuery = searchParams.get("barcode")?.trim();

    if (!barcodeFromQuery) {
      return;
    }

    setHasAutoLookedUp(true);
    setBarcode(barcodeFromQuery);
    void lookupBarcode(barcodeFromQuery);
  }, [
    hasAutoLookedUp,
    lookupBarcode,
    requestedPantryTarget,
    searchParams,
    validatedPantryTarget,
    validatingPantryTarget,
  ]);

  if (validatingPantryTarget || (requestedPantryTarget && !validatedPantryTarget)) {
    return null;
  }

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
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
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
                onClick={backToPantryStats}
              >
                Back to pantry stats
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
