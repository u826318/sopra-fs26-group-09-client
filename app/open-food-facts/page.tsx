"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import type { Product } from "@/types/product";
import ProductResultCard from "@/components/products/ProductResultCard";
import {
  Button,
  Card,
  Collapse,
  Empty,
  Form,
  Input,
  Space,
  Tabs,
  Typography,
} from "antd";

const { Title, Paragraph } = Typography;

export default function OpenFoodFactsPortalPage() {
  const router = useRouter();
  const api = useApi();

  const [barcode, setBarcode] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<Product | null>(null);
  const [searchResults, setSearchResults] = useState<Product[]>([]);

  const priorityResult = searchResults.length > 0 ? searchResults[0] : null;

  const pantryTarget = useMemo(() => {
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

  const lookupBarcode = async () => {
    setLoading(true);
    try {
      const result = await api.get<Product>(
        `/products/lookup?barcode=${encodeURIComponent(barcode)}`,
      );
      setBarcodeResult(result);
    } catch (error) {
      setBarcodeResult(null);
      alert(error instanceof Error ? error.message : "Barcode lookup failed.");
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async () => {
    setLoading(true);
    try {
      const results = await api.get<Product[]>(
        `/products/search?q=${encodeURIComponent(query)}&limit=12`,
      );
      setSearchResults(results);
    } catch (error) {
      setSearchResults([]);
      alert(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-container" style={{ padding: 24 }}>
      <Card style={{ width: "100%", maxWidth: 1200 }}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <Space style={{ width: "100%", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              <Title level={2} style={{ marginBottom: 0 }}>
                Open Food Facts API portal
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Look up a product by barcode or full product name. Nutrition and store-related
                fields are surfaced first, and the raw API payload is still available below.
              </Paragraph>
              {pantryTarget ? (
                <Paragraph style={{ marginBottom: 0 }}>
                  Pantry target: <strong>{pantryTarget.householdName ?? `Household ${pantryTarget.householdId}`}</strong>
                </Paragraph>
              ) : null}
            </div>
            <Space wrap>
              <Button onClick={() => router.push("/")}>Home</Button>
              <Button type="primary" onClick={() => router.push("/users")}>Users</Button>
              {pantryTarget ? (
                <Button
                  onClick={() =>
                    router.push(
                      `/households/${pantryTarget.householdId}?name=${encodeURIComponent(
                        pantryTarget.householdName ?? `Household ${pantryTarget.householdId}`,
                      )}`,
                    )
                  }
                >
                  Back to pantry
                </Button>
              ) : null}
            </Space>
          </Space>

          <Tabs
            defaultActiveKey="barcode"
            items={[
              {
                key: "barcode",
                label: "Barcode lookup",
                children: (
                  <Space orientation="vertical" size="large" style={{ width: "100%" }}>
                    <Form layout="vertical">
                      <Form.Item label="Barcode">
                        <Input
                          value={barcode}
                          onChange={(event) => setBarcode(event.target.value)}
                          placeholder="e.g. 3017624010701"
                        />
                      </Form.Item>
                      <Button type="primary" loading={loading} onClick={() => void lookupBarcode()}>
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
                ),
              },
              {
                key: "search",
                label: "Full-name search",
                children: (
                  <Space orientation="vertical" size="large" style={{ width: "100%" }}>
                    <Form layout="vertical">
                      <Form.Item label="Product full name / search query">
                        <Input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="e.g. plant based caprese"
                        />
                      </Form.Item>
                      <Button type="primary" loading={loading} onClick={() => void searchProducts()}>
                        Search Open Food Facts
                      </Button>
                    </Form>

                    {priorityResult ? (
                      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
                        <Title level={4} style={{ marginBottom: 0 }}>
                          Priority result
                        </Title>
                        <ProductResultCard
                          product={priorityResult}
                          label="Top match"
                          rawTitle="All raw product fields returned by the API"
                          exportContext="Open Food Facts API full-name search priority result"
                          pantryContext={pantryTarget ?? undefined}
                        />

                        <Title level={4} style={{ marginBottom: 0 }}>
                          All possible results returned for this search
                        </Title>
                        <Collapse
                          items={searchResults.map((product, index) => ({
                            key: `${product.barcode ?? product.name ?? "product"}-${index}`,
                            label: `${index + 1}. ${product.name ?? "Unknown product"} — ${product.brand ?? "Unknown brand"}`,
                            children: (
                              <ProductResultCard
                                product={product}
                                label={index === 0 ? "Priority result" : `Result ${index + 1}`}
                                rawTitle="All raw product fields returned by the API"
                                exportContext={`Open Food Facts API full-name search result ${index + 1}`}
                                pantryContext={pantryTarget ?? undefined}
                              />
                            ),
                          }))}
                        />
                      </Space>
                    ) : (
                      <Empty description="No search results yet." />
                    )}
                  </Space>
                ),
              },
            ]}
          />
        </Space>
      </Card>
    </div>
  );
}
