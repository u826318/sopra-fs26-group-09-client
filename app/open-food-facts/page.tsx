"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import type { Product } from "@/types/product";
import ProductResultCard from "@/components/products/ProductResultCard";
import { Button, Card, Empty, Form, Input, Space, Typography } from "antd";

const { Title, Paragraph } = Typography;

type PantryTarget = {
  householdId: number;
  householdName?: string;
};

export default function OpenFoodFactsPortalPage() {
  const api = useApi();
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<Product | null>(null);
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

    const autoLookup = async () => {
      setLoading(true);
      try {
        const result = await api.get<Product>(
          `/products/lookup?barcode=${encodeURIComponent(barcodeFromQuery)}`,
        );
        setBarcodeResult(result);
      } catch (error) {
        setBarcodeResult(null);
        alert(error instanceof Error ? error.message : "Barcode lookup failed.");
      } finally {
        setLoading(false);
      }
    };

    void autoLookup();
  }, [api, hasAutoLookedUp]);

  const lookupBarcode = async () => {
    const barcodeToLookup = barcode.trim();
    if (!barcodeToLookup) {
      alert("Please enter a barcode first.");
      return;
    }

    setLoading(true);
    try {
      const result = await api.get<Product>(
        `/products/lookup?barcode=${encodeURIComponent(barcodeToLookup)}`,
      );
      setBarcodeResult(result);
      setBarcode(barcodeToLookup);
    } catch (error) {
      setBarcodeResult(null);
      alert(error instanceof Error ? error.message : "Barcode lookup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-container" style={{ padding: 24 }}>
      <Card style={{ width: "100%", maxWidth: 1200 }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <Title level={2} style={{ marginBottom: 0 }}>
              Open Food Facts portal
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Look up products by barcode through Open Food Facts.
            </Paragraph>
            {pantryTarget ? (
              <Paragraph style={{ marginBottom: 0 }}>
                Pantry target:{" "}
                <strong>
                  {pantryTarget.householdName ?? `Household ${pantryTarget.householdId}`}
                </strong>
              </Paragraph>
            ) : null}
          </div>

          {pantryTarget ? (
            <Paragraph style={{ marginBottom: 0 }}>
              This lookup is currently linked to {" "}
              <strong>
                {pantryTarget.householdName ?? `Household ${pantryTarget.householdId}`}
              </strong>
              . You can add matching products straight into that pantry below.
            </Paragraph>
          ) : null}

          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Form layout="vertical">
              <Form.Item label="Barcode">
                <Input
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  placeholder="e.g. 3017624010701"
                />
              </Form.Item>
              <Button
                type="primary"
                loading={loading}
                htmlType="button"
                onClick={() => void lookupBarcode()}
              >
                Look up barcode
              </Button>
            </Form>

            {barcodeResult ? (
              <ProductResultCard
                product={barcodeResult}
                label="Barcode result"
                rawTitle="All raw product fields returned by the API"
                exportContext="Open Food Facts API barcode lookup"
                pantryContext={pantryTarget ?? undefined}
              />
            ) : (
              <Empty description="No barcode result yet." />
            )}
          </Space>
        </Space>
      </Card>
    </div>
  );
}
