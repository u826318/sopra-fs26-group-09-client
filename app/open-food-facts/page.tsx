"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import type { Product } from "@/types/product";
import ProductResultCard from "@/components/products/ProductResultCard";
import { Button, Card, Empty, Form, Input, Space, Typography } from "antd";
import { useAuthGuard } from "@/hooks/useAuthGuard";

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
    <div className="card-container" style={{ padding: 24 }}>
      <Card style={{ width: "100%", maxWidth: 1200 }}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <button
                type="button"
                onClick={() => router.push("/stats")}
                style={{
                  border: "1px solid #d9d0c6",
                  borderRadius: 999,
                  padding: "0 18px",
                  minHeight: 44,
                  fontSize: 16,
                  background: "#ffffff",
                  color: "#1f1f1f",
                  cursor: "pointer",
                }}
              >
                Back to household page
              </button>
            </div>

            <div>
              <Title level={2} style={{ marginBottom: 0 }}>
                Product Lookup Portal
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Look up a product by barcode.
              </Paragraph>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 8 }}>
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
            <div>
              <button
                type="button"
                onClick={() => void lookupBarcode(barcode)}
                disabled={loading}
                style={{
                  border: "none",
                  borderRadius: 999,
                  padding: "0 24px",
                  minHeight: 52,
                  fontSize: 18,
                  color: "#ffffff",
                  background: loading ? "#9c7b59" : "#106832",
                  cursor: loading ? "progress" : "pointer",
                }}
              >
                {loading ? "Looking up..." : "Look up barcode"}
              </button>
            </div>
          </div>

          {lookupMessage ? (
            <div
              role="alert"
              style={{
                padding: "14px 16px",
                borderRadius: 16,
                background: "#fff2f0",
                border: "1px solid #ffccc7",
                color: "#a8071a",
                fontSize: 16,
              }}
            >
              {lookupMessage}
            </div>
          ) : null}

          {barcodeResult ? (
            <ProductResultCard
              product={barcodeResult}
              rawTitle=""
              exportContext="Product lookup"
              pantryContext={pantryTarget ?? undefined}
            />
          ) : lookupMessage ? null : (
            <Empty description="No product loaded yet." />
          )}
        </Space>
      </Card>
    </div>
  );
}
