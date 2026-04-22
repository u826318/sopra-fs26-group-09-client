"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import type { Product } from "@/types/product";
import useSessionStorage from "@/hooks/useSessionStorage";
import type { ReceiptAnalysisResult, ReceiptLineItem } from "@/types/receipt";
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

type PantryTarget = {
  householdId: number;
  householdName?: string;
};

type KeyValueRow = {
  label: string;
  value: string | null;
};

const receiptSummaryFields: KeyValueRow[] = [];

export default function OpenFoodFactsPortalPage() {
  const router = useRouter();
  const api = useApi();
  const { value: sessionToken, set: setSessionToken } = useSessionStorage<string>("token", "");
  const { set: setSessionUsername } = useSessionStorage<string>("username", "");
  const [demoSessionReady, setDemoSessionReady] = useState(false);
  const receiptPreviewUrlRef = useRef<string | null>(null);
  const hasAutoLookedUpRef = useRef(false);

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

  const receiptSummary = useMemo<KeyValueRow[]>(() => {
    if (!receiptResult) {
      return receiptSummaryFields;
    }

    return [
      { label: "Status", value: receiptResult.status },
      { label: "Merchant / store", value: receiptResult.merchantName },
      { label: "Phone", value: receiptResult.merchantPhoneNumber },
      { label: "Address", value: receiptResult.merchantAddress },
      { label: "Transaction date", value: receiptResult.transactionDate },
      { label: "Transaction time", value: receiptResult.transactionTime },
      { label: "Receipt type", value: receiptResult.receiptType },
      { label: "Country / region", value: receiptResult.countryRegion },
      { label: "Currency", value: receiptResult.currencyCode },
      { label: "Subtotal", value: receiptResult.subtotal },
      { label: "Tax", value: receiptResult.tax },
      { label: "Tip", value: receiptResult.tip },
      { label: "Total", value: receiptResult.total },
    ].filter((entry) => entry.value);
  }, [receiptResult]);

  useEffect(() => {
    return () => {
      if (
        receiptPreviewUrlRef.current &&
        typeof URL !== "undefined" &&
        typeof URL.revokeObjectURL === "function"
      ) {
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
        const response = await api.post<{ token?: string; username?: string }>(
          "/users/demo-login",
          {},
        );

        if (!isMounted) {
          return;
        }

        if (response.token) {
          setSessionToken(response.token);
        }
        setSessionUsername(response.username?.trim() || "debug-demo");
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
  }, [api, sessionToken, setSessionToken, setSessionUsername]);

  useEffect(() => {
    if (typeof globalThis.window === "undefined" || hasAutoLookedUpRef.current) {
      return;
    }

    const params = new URLSearchParams(globalThis.location.search);
    const barcodeFromQuery = params.get("barcode")?.trim();

    if (!barcodeFromQuery) {
      return;
    }

    hasAutoLookedUpRef.current = true;
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
  }, [api]);

  const resetReceiptState = () => {
    setReceiptError(null);
    setReceiptResult(null);
  };

  const setReceiptPreview = (file?: File) => {
    if (
      receiptPreviewUrlRef.current &&
      typeof URL !== "undefined" &&
      typeof URL.revokeObjectURL === "function"
    ) {
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

    const nextPreviewUrl =
      typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
        ? URL.createObjectURL(file)
        : null;

    receiptPreviewUrlRef.current = nextPreviewUrl;
    setReceiptFile(file);
    setReceiptPreviewUrl(nextPreviewUrl);
    setReceiptFileName(file.name);
  };

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

  const searchProducts = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      alert("Please enter a product name first.");
      return;
    }

    setLoading(true);
    try {
      const results = await api.get<Product[]>(
        `/products/search?q=${encodeURIComponent(trimmedQuery)}&limit=12`,
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
      setReceiptError(
        error instanceof Error ? error.message : "Receipt analysis failed.",
      );
    } finally {
      setReceiptLoading(false);
    }
  };

  const renderReceiptSummary = (rows: KeyValueRow[]) => {
    if (rows.length === 0) {
      return <Empty description="No structured receipt fields returned yet." />;
    }

    return (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th
                style={{ textAlign: "left", verticalAlign: "top", padding: "8px 12px 8px 0" }}
                scope="row"
              >
                {row.label}
              </th>
              <td style={{ padding: "8px 0" }}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderReceiptItemsTable = (items: ReceiptLineItem[] | null | undefined) => {
    if (!items || items.length === 0) {
      return <Empty description="No receipt line items returned yet." />;
    }

    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px 12px 8px 0" }}>Product</th>
              <th style={{ textAlign: "left", padding: "8px 12px 8px 0" }}>Quantity</th>
              <th style={{ textAlign: "left", padding: "8px 12px 8px 0" }}>Unit price</th>
              <th style={{ textAlign: "left", padding: "8px 12px 8px 0" }}>Total price</th>
              <th style={{ textAlign: "left", padding: "8px 0" }}>Product code</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.description ?? "item"}-${index}`}>
                <td style={{ padding: "8px 12px 8px 0" }}>{item.description ?? "—"}</td>
                <td style={{ padding: "8px 12px 8px 0" }}>{item.quantity ?? "—"}</td>
                <td style={{ padding: "8px 12px 8px 0" }}>{item.price ?? "—"}</td>
                <td style={{ padding: "8px 12px 8px 0" }}>{item.totalPrice ?? "—"}</td>
                <td style={{ padding: "8px 0" }}>{item.productCode ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="card-container" style={{ padding: 24 }}>
      <Card style={{ width: "100%", maxWidth: 1200 }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Space style={{ width: "100%", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              <Title level={2} style={{ marginBottom: 0 }}>
                Debug portal
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Public debugging workspace for Open Food Facts lookups, barcode
                utilities, and Azure receipt extraction. It auto-starts a demo
                session in session storage so a browser refresh clears it naturally.
              </Paragraph>
              {pantryTarget ? (
                <Paragraph style={{ marginBottom: 0 }}>
                  Pantry target:{" "}
                  <strong>
                    {pantryTarget.householdName ?? `Household ${pantryTarget.householdId}`}
                  </strong>
                </Paragraph>
              ) : null}
              <Paragraph style={{ marginBottom: 0 }}>
                Session mode:{" "}
                <strong>
                  {demoSessionReady
                    ? sessionToken
                      ? "demo token ready"
                      : "guest access"
                    : "starting demo session..."}
                </strong>
              </Paragraph>
            </div>

            <Space wrap>
              <Button onClick={() => router.push("/")} htmlType="button">
                Home
              </Button>
              <Button
                type="primary"
                onClick={() => router.push("/users")}
                htmlType="button"
              >
                Users
              </Button>
              {pantryTarget ? (
                <Button
                  htmlType="button"
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
                ),
              },
              {
                key: "search",
                label: "Full-name search",
                children: (
                  <Space direction="vertical" size="large" style={{ width: "100%" }}>
                    <Form layout="vertical">
                      <Form.Item label="Product full name / search query">
                        <Input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="e.g. plant based caprese"
                        />
                      </Form.Item>
                      <Button
                        type="primary"
                        loading={loading}
                        htmlType="button"
                        onClick={() => void searchProducts()}
                      >
                        Search Open Food Facts
                      </Button>
                    </Form>

                    {priorityResult ? (
                      <Space direction="vertical" size="large" style={{ width: "100%" }}>
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
                  <Space direction="vertical" size="large" style={{ width: "100%" }}>
                    <Card size="small" title="Upload + confirmation">
                      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                        <Paragraph style={{ marginBottom: 0 }}>
                          Pick a receipt image from your device. The image is only
                          previewed in this session. When you click the analyze
                          button, the file is sent to your Spring backend, which then
                          calls Azure Document Intelligence.
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
                            htmlType="button"
                            disabled={!receiptFile}
                            loading={receiptLoading}
                            onClick={() => void analyzeReceipt()}
                          >
                            Analyze with Azure receipt model
                          </Button>
                          {receiptPreviewUrl ? (
                            <Button htmlType="button" onClick={() => setReceiptPreview(undefined)}>
                              Remove image
                            </Button>
                          ) : null}
                        </Space>

                        {receiptError ? (
                          <Paragraph style={{ marginBottom: 0, color: "#cf1322" }}>
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

                    <Card size="small" title="Structured receipt result">
                      {receiptLoading ? (
                        <Paragraph style={{ marginBottom: 0 }}>
                          Sending the previewed image to Azure and waiting for the
                          structured receipt result...
                        </Paragraph>
                      ) : receiptResult ? (
                        <Space direction="vertical" size="large" style={{ width: "100%" }}>
                          <div>
                            <Title level={4}>Store and totals</Title>
                            {renderReceiptSummary(receiptSummary)}
                          </div>

                          <div>
                            <Title level={4}>Line items</Title>
                            {renderReceiptItemsTable(receiptResult.items)}
                          </div>

                          <div>
                            <Title level={4}>OCR text</Title>
                            {receiptResult.rawText ? (
                              <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                                {receiptResult.rawText}
                              </pre>
                            ) : (
                              <Empty description="No OCR text returned." />
                            )}
                          </div>

                          <Collapse
                            items={[
                              {
                                key: "receipt-fields",
                                label: "All extracted receipt fields",
                                children: (
                                  <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                                    {JSON.stringify(receiptResult.extractedFields ?? {}, null, 2)}
                                  </pre>
                                ),
                              },
                              {
                                key: "receipt-raw-result",
                                label: "Raw Azure result payload",
                                children: (
                                  <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                                    {JSON.stringify(receiptResult.rawResult ?? {}, null, 2)}
                                  </pre>
                                ),
                              },
                            ]}
                          />
                        </Space>
                      ) : (
                        <Empty description="No Azure receipt result yet." />
                      )}
                    </Card>
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