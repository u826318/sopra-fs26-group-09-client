"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import type { Product } from "@/types/product";
import useSessionStorage from "@/hooks/useSessionStorage";
import type { ReceiptAnalysisResult } from "@/types/receipt";
import ProductResultCard from "@/components/products/ProductResultCard";
import ReceiptAnalysisResultPanel from "@/components/receipts/ReceiptAnalysisResultPanel";
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

type PantryTarget = {
  householdId: number;
  householdName?: string;
};


export default function OpenFoodFactsPortalPage() {
  const router = useRouter();
  const api = useApi();
  const { value: sessionToken, set: setSessionToken } = useSessionStorage<string>("token", "");
  const { set: setSessionUsername } = useSessionStorage<string>("username", "");
  const { set: setSessionUserId } = useSessionStorage<number | null>("userId", null);
  const [demoSessionReady, setDemoSessionReady] = useState(false);
  const receiptPreviewUrlRef = useRef<string | null>(null);

  const [barcode, setBarcode] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<Product | null>(null);
  const [searchResults, setSearchResults] = useState<Product[]>([]);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [receiptResult, setReceiptResult] = useState<ReceiptAnalysisResult | null>(null);

  const priorityResult = searchResults.length > 0 ? searchResults[0] : null;

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
    return () => {
      if (receiptPreviewUrlRef.current) {
        URL.revokeObjectURL(receiptPreviewUrlRef.current);
      }
    };
  }, []);


  useEffect(() => {
    let isMounted = true;

    const bootstrapDemoSession = async () => {
      if (sessionToken) {
        if (isMounted) {
          setDemoSessionReady(true);
        }
        return;
      }

      try {
        const response = await api.post<{ id?: number; token?: string; username?: string }>("/users/demo-login", {});
        if (!isMounted) {
          return;
        }

        if (response.token) {
          setSessionToken(response.token);
        }
        setSessionUsername(response.username?.trim() || "debug-demo");
        setSessionUserId(response.id ?? null);
      } catch (error) {
        console.error("Failed to bootstrap debug portal demo session.", error);
      } finally {
        if (isMounted) {
          setDemoSessionReady(true);
        }
      }
    };

    void bootstrapDemoSession();

    return () => {
      isMounted = false;
    };
  }, [api, sessionToken, setSessionToken, setSessionUsername, setSessionUserId]);

  const resetReceiptState = () => {
    setReceiptError(null);
    setReceiptResult(null);
  };

  const setReceiptPreview = (file?: File) => {
    if (receiptPreviewUrlRef.current) {
      URL.revokeObjectURL(receiptPreviewUrlRef.current);
      receiptPreviewUrlRef.current = null;
    }

    resetReceiptState();

    if (!file) {
      setReceiptFile(null);
      setReceiptPreviewUrl(null);
      setReceiptFileName(null);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setReceiptFile(null);
      setReceiptPreviewUrl(null);
      setReceiptFileName(null);
      setReceiptError("Receipt image must be 2 MB or smaller.");
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    receiptPreviewUrlRef.current = nextPreviewUrl;
    setReceiptFile(file);
    setReceiptPreviewUrl(nextPreviewUrl);
    setReceiptFileName(file.name);
  };

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

  const analyzeReceipt = async () => {
    if (!receiptFile) {
      setReceiptError("Choose a receipt image before sending it to Azure.");
      return;
    }

    setReceiptLoading(true);
    setReceiptError(null);
    setReceiptResult(null);

    try {
      const formData = new FormData();
      formData.append("image", receiptFile);
      const result = await api.postFormData<ReceiptAnalysisResult>(
        "/products/receipt/analyze",
        formData,
      );
      setReceiptResult(result);
    } catch (error) {
      setReceiptResult(null);
      setReceiptError(error instanceof Error ? error.message : "Receipt analysis failed.");
    } finally {
      setReceiptLoading(false);
    }
  };



  return (
    <div className="card-container" style={{ padding: 24 }}>
      <Card style={{ width: "100%", maxWidth: 1200 }}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <Space style={{ width: "100%", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              <Title level={2} style={{ marginBottom: 0 }}>
                Debug portal
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Public debugging workspace for Open Food Facts lookups, barcode utilities, and
                Azure receipt extraction. It auto-starts a demo session in session storage so a
                browser refresh clears it naturally.
              </Paragraph>
              {pantryTarget ? (
                <Paragraph style={{ marginBottom: 0 }}>
                  Pantry target: <strong>{pantryTarget.householdName ?? `Household ${pantryTarget.householdId}`}</strong>
                </Paragraph>
              ) : null}
              <Paragraph style={{ marginBottom: 0 }}>
                Session mode: <strong>{demoSessionReady ? (sessionToken ? "demo token ready" : "guest access") : "starting demo session..."}</strong>
              </Paragraph>
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
              {
                key: "receipt-image",
                label: "Receipt image upload",
                children: (
                  <Space orientation="vertical" size="large" style={{ width: "100%" }}>
                    <Card size="small" title="Upload + confirmation">
                      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                        <Paragraph style={{ marginBottom: 0 }}>
                          Pick a receipt image from your device. The image is only previewed in
                          this session. When you click the analyze button, the file is sent to your
                          Spring backend, which then calls Azure Document Intelligence.
                        </Paragraph>
                        <input
                          aria-label="Upload receipt image"
                          type="file"
                          accept="image/*"
                          onChange={(event) => setReceiptPreview(event.target.files?.[0])}
                        />
                        {receiptFileName ? (
                          <Paragraph style={{ marginBottom: 0 }}>
                            Selected file: <strong>{receiptFileName}</strong>
                          </Paragraph>
                        ) : null}
                        <Space wrap>
                          <Button
                            type="primary"
                            disabled={!receiptFile}
                            loading={receiptLoading}
                            onClick={() => void analyzeReceipt()}
                          >
                            Analyze with Azure receipt model
                          </Button>
                          {receiptPreviewUrl ? (
                            <Button onClick={() => setReceiptPreview(undefined)}>
                              Remove image
                            </Button>
                          ) : null}
                        </Space>
                        {receiptError ? (
                          <Paragraph type="danger" style={{ marginBottom: 0 }}>
                            {receiptError}
                          </Paragraph>
                        ) : null}
                      </Space>
                    </Card>

                    <Card size="small" title="Preview">
                      {receiptPreviewUrl ? (
                        <div>
                          <img
                            src={receiptPreviewUrl}
                            alt="Uploaded receipt preview"
                            style={{ maxWidth: "100%", maxHeight: 480, objectFit: "contain" }}
                          />
                        </div>
                      ) : (
                        <Empty description="No receipt image uploaded yet." />
                      )}
                    </Card>

                    <ReceiptAnalysisResultPanel
                      result={receiptResult}
                      loading={receiptLoading}
                      emptyDescription="No Azure receipt result yet."
                      showMetadata
                      cardTitle="Structured receipt result"
                    />
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
