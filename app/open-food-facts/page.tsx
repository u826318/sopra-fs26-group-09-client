"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import type { Product, ProductSearchCandidate, ProductSearchResponse } from "@/types/product";
import ProductResultCard from "@/components/products/ProductResultCard";
import { App, Button, Card, Empty, Image, Input, Space, Typography } from "antd";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import useSessionStorage from "@/hooks/useSessionStorage";
import { usePantryWebSocket } from "@/hooks/usePantryWebSocket";
import { VirtualPantryAppShell } from "@/components/VirtualPantryAppShell";
import type { HouseholdWithRole } from "@/types/household";
import styles from "@/styles/openFoodFacts.module.css";
import { ArrowLeftOutlined } from "@ant-design/icons";

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

type NameProductCardState = {
  candidate: ProductSearchCandidate;
  productIndex: number | null;
  status: "loading" | "loaded" | "error";
  product?: Product;
  errorMessage?: string;
};

function getProductImageUrl(product?: Product): string | null {
  return product?.imageUrl?.trim() || null;
}

function getProductDisplayName(product?: Product, candidate?: ProductSearchCandidate): string {
  return product?.name?.trim() || candidate?.name?.trim() || "Unnamed product";
}

function getProductBrand(product?: Product, candidate?: ProductSearchCandidate): string {
  return product?.brand?.trim() || candidate?.brand?.trim() || "Unknown brand";
}

function getProductBarcode(product?: Product): string {
  return product?.barcode?.trim() || "Barcode unavailable";
}

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
  const { value: token } = useSessionStorage<string>("token", "");
  const { value: storedUserId } = useSessionStorage<string>("userId", "");
  const { value: cachedHouseholds, set: setHouseholds } = useSessionStorage<HouseholdWithRole[]>("households", []);
  const { clear: clearSelectedHouseholdId } = useSessionStorage<number | null>("selectedHouseholdId", null);
  const currentUserId = storedUserId ? Number(storedUserId) : null;
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<Product | null>(null);
  const [nameQuery, setNameQuery] = useState("");
  const [nameSearchLoading, setNameSearchLoading] = useState(false);
  const [nameSearchResponse, setNameSearchResponse] = useState<ProductSearchResponse | null>(null);
  const [nameProductCards, setNameProductCards] = useState<NameProductCardState[]>([]);
  const [nameSelectedProduct, setNameSelectedProduct] = useState<Product | null>(null);
  const nameResultsScrollRef = useRef<HTMLDivElement | null>(null);
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

  usePantryWebSocket({
    householdId: requestedPantryTarget?.householdId ?? null,
    token,
    onMessage: (msg) => {
      if (msg.eventType === "HOUSEHOLD_DELETED" || (msg.eventType === "MEMBER_REMOVED" && msg.removedUserId === currentUserId)) {
        setHouseholds(cachedHouseholds.filter((h) => h.householdId !== requestedPantryTarget?.householdId));
        clearSelectedHouseholdId();
        message.warning(msg.eventType === "HOUSEHOLD_DELETED" ? "This household has been deleted." : "You have been removed from this household.");
        router.push("/households");
      }
    },
  });

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
      setNameSelectedProduct(null);
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

  const searchByName = useCallback(async () => {
    const query = nameQuery.trim();
    if (!query) {
      message.warning("Please enter a product name first.");
      return;
    }

    setLookupMessage("");
    setBarcodeResult(null);
    setNameSelectedProduct(null);
    setNameProductCards([]);
    setNameSearchLoading(true);
    try {
      const result = await api.get<ProductSearchResponse>(
        `/products/search?q=${encodeURIComponent(query)}&limit=5`,
      );
      setNameSearchResponse(result);

      const candidates = (result.candidates ?? []).slice(0, 5);
      const initialCards: NameProductCardState[] = candidates.map((candidate) => ({
        candidate,
        productIndex: candidate.productIndex,
        status: candidate.productIndex ? "loading" : "error",
        errorMessage: candidate.productIndex ? undefined : "Cannot find this product",
      }));

      setNameProductCards(initialCards);

      if (result.status !== "OK" || candidates.length === 0) {
        return;
      }

      const loadedCards = await Promise.all(
        candidates.map(async (candidate): Promise<NameProductCardState> => {
          if (!candidate.productIndex) {
            return {
              candidate,
              productIndex: null,
              status: "error",
              errorMessage: "Cannot find this product",
            };
          }

          try {
            const product = await api.get<Product>(
              `/products/index/${encodeURIComponent(String(candidate.productIndex))}`,
            );

            return {
              candidate,
              productIndex: candidate.productIndex,
              status: "loaded",
              product,
            };
          } catch {
            return {
              candidate,
              productIndex: candidate.productIndex,
              status: "error",
              errorMessage: "Cannot find this product",
            };
          }
        }),
      );

      setNameProductCards(loadedCards);
    } catch {
      setNameSearchResponse({
        query,
        normalizedQuery: query,
        status: "ERROR",
        message: "Product name search is currently unavailable.",
        totalCandidateCount: 0,
        anchorTokens: [],
        auxiliaryTokens: [],
        candidates: [],
      });
      setNameProductCards([]);
    } finally {
      setNameSearchLoading(false);
    }
  }, [api, message, nameQuery]);

  const selectNameProductCard = useCallback((card: NameProductCardState) => {
    if (card.status !== "loaded" || !card.product) {
      return;
    }

    setNameSelectedProduct(card.product);
    setBarcode(card.product.barcode ?? "");
    setLookupMessage("");
  }, []);

  const scrollNameResults = useCallback((direction: "left" | "right") => {
    nameResultsScrollRef.current?.scrollBy({
      left: direction === "left" ? -520 : 520,
      behavior: "smooth",
    });
  }, []);

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
        <Button
          size="middle"
          icon={<ArrowLeftOutlined />}
          onClick={backToPantryStats}
          style={{ marginBottom: 18, borderRadius: 12, fontWeight: 600 }}
        >
          {pantryTarget ? "Pantry stats" : "Households"}
        </Button>
        <Title level={1} className={styles.pageTitle}>
          Product Lookup Portal
        </Title>
        <Paragraph className={styles.pageSubtitle}>
          Search the local product dataset by barcode or product name and add matching products straight into your pantry flow.
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
              {/* Issue #114 — manual add entry point; only shown when browsing with a household context */}
              {pantryTarget ? (
                <Button
                  className={styles.secondaryBtn}
                  onClick={() =>
                    router.push(
                      `/pantry/add/manual?householdId=${pantryTarget.householdId}&householdName=${encodeURIComponent(pantryTarget.householdName ?? "")}`,
                    )
                  }
                >
                  Add manually
                </Button>
              ) : null}
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

      <Card title="Search by product name" className={styles.sectionCard} style={{ marginTop: 24 }}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <div className={styles.lookupStack}>
            <label className={styles.lookupLabel}>
              <span>Product name</span>
              <Input
                value={nameQuery}
                onChange={(event) => {
                  setNameQuery(event.target.value);
                  setNameSearchResponse(null);
                  setNameProductCards([]);
                  setNameSelectedProduct(null);
                }}
                onPressEnter={() => void searchByName()}
                placeholder="e.g. TIK UDON Noodles"
              />
            </label>

            <div className={styles.lookupActions}>
              <Button
                type="primary"
                className={styles.primaryBtn}
                onClick={() => void searchByName()}
                loading={nameSearchLoading}
              >
                {nameSearchLoading ? "Searching..." : "Search by name"}
              </Button>
            </div>
          </div>

          {nameSelectedProduct ? (
            <div className={styles.nameSelectedResult}>
              <div className={styles.nameSelectedLabel}>Selected product</div>
              <ProductResultCard
                product={nameSelectedProduct}
                rawTitle=""
                exportContext="Product name lookup"
                pantryContext={pantryTarget ?? undefined}
              />
            </div>
          ) : null}

          {nameSearchResponse ? (
            <div className={styles.nameSearchResultBox}>
              <div className={styles.nameSearchMessage}>
                {nameSearchResponse.message || "Choose one of the matching products."}
              </div>

              {nameSearchResponse.anchorTokens?.length ? (
                <div className={styles.nameSearchMeta}>
                  Anchors: {nameSearchResponse.anchorTokens.join(", ")}
                  {nameSearchResponse.auxiliaryTokens?.length
                    ? ` · Auxiliary: ${nameSearchResponse.auxiliaryTokens.join(", ")}`
                    : ""}
                </div>
              ) : null}

              {nameProductCards.length ? (
                <div className={styles.nameCarouselShell}>
                  <Button
                    htmlType="button"
                    aria-label="Scroll name search results left"
                    className={styles.nameCarouselNav}
                    onClick={() => scrollNameResults("left")}
                  >
                    ‹
                  </Button>

                  <div
                    ref={nameResultsScrollRef}
                    className={styles.nameProductTrack}
                    aria-label="Matching local dataset products"
                  >
                    {nameProductCards.map((card) => {
                      const productName = getProductDisplayName(card.product, card.candidate);
                      const brand = getProductBrand(card.product, card.candidate);
                      const barcodeText = getProductBarcode(card.product);
                      const imageUrl = getProductImageUrl(card.product);
                      const isLoaded = card.status === "loaded" && card.product;

                      return (
                        <button
                          key={`${card.productIndex ?? card.candidate.name ?? productName}`}
                          type="button"
                          className={`${styles.nameProductCard} ${isLoaded ? "" : styles.nameProductCardDisabled}`}
                          onClick={() => selectNameProductCard(card)}
                          disabled={!isLoaded}
                          aria-label={isLoaded ? `Select ${productName}` : `Cannot find ${productName}`}
                        >
                          <div className={styles.nameProductImageFrame}>
                            {card.status === "loading" ? (
                              <div className={styles.nameProductPlaceholder}>Loading...</div>
                            ) : imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={productName}
                                className={styles.nameProductImage}
                                preview={false}
                              />
                            ) : card.status === "error" ? (
                              <div className={styles.nameProductError}>Cannot find this product</div>
                            ) : (
                              <div className={styles.nameProductPlaceholder}>No image</div>
                            )}
                          </div>

                          <span className={styles.nameProductName}>{productName}</span>
                          <span className={styles.nameProductDetail}>{brand}</span>
                          <span className={styles.nameProductBarcode}>{barcodeText}</span>
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    htmlType="button"
                    aria-label="Scroll name search results right"
                    className={styles.nameCarouselNav}
                    onClick={() => scrollNameResults("right")}
                  >
                    ›
                  </Button>
                </div>
              ) : (
                <div className={styles.nameSearchMeta}>
                  No selectable product candidates returned. Try a more specific product name.
                </div>
              )}
            </div>
          ) : null}
        </Space>
      </Card>

      <section className={styles.resultSection}>
        {barcodeResult ? (
          <>
            <ProductResultCard
              product={barcodeResult}
              rawTitle=""
              exportContext="Product lookup"
              pantryContext={pantryTarget ?? undefined}
            />
          </>
        ) : lookupMessage || nameSelectedProduct ? null : (
          <div className={styles.emptyState}>
            <Empty description="No product loaded yet." />
          </div>
        )}
      </section>
    </VirtualPantryAppShell>
  );
}
