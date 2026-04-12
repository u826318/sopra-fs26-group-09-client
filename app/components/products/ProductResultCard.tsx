"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import type { PantryItem } from "@/types/pantry";
import type { Product } from "@/types/product";
import { buildPantryItemPayload, estimateKcalPerPackage } from "@/utils/pantry";
import { exportProductAsText } from "@/utils/productExport";
import {
  Button,
  Card,
  Collapse,
  Descriptions,
  Empty,
  Image,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";

const { Text } = Typography;

const NUTRITION_PRIORITY_KEYS = [
  "energy-kcal_100g",
  "energy-kcal_100ml",
  "energy-kcal_serving",
  "fat_100g",
  "saturated-fat_100g",
  "carbohydrates_100g",
  "sugars_100g",
  "fiber_100g",
  "proteins_100g",
  "salt_100g",
  "sodium_100g",
];

type TableRow = {
  key: string;
  name: string;
  value: string;
};

type PantryContext = {
  householdId: number;
  householdName?: string;
};

function normalizeObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function renderScalar(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function buildNutritionRows(product: Product): TableRow[] {
  const nutriments = normalizeObject(product.nutriments);
  const entries = Object.entries(nutriments);

  const priorityRows = NUTRITION_PRIORITY_KEYS
    .filter((key) => key in nutriments)
    .map((key) => ({
      key,
      name: key,
      value: renderScalar(nutriments[key]),
    }));

  const seen = new Set(priorityRows.map((row) => row.key));
  const remainingRows = entries
    .filter(([key]) => !seen.has(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      key,
      name: key,
      value: renderScalar(value),
    }));

  return [...priorityRows, ...remainingRows];
}

export default function ProductResultCard({
  product,
  label,
  rawTitle,
  exportContext,
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
  const nutritionRows = useMemo(() => buildNutritionRows(product), [product]);
  const estimatedKcal = useMemo(() => estimateKcalPerPackage(product), [product]);
  const stores = product.stores ?? [];
  const storeTags = product.storeTags ?? [];
  const purchasePlaces = product.purchasePlaces ?? [];

  const [packageCount, setPackageCount] = useState(1);
  const [kcalPerPackageInput, setKcalPerPackageInput] = useState(
    estimatedKcal !== null ? String(estimatedKcal) : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    setKcalPerPackageInput(estimatedKcal !== null ? String(estimatedKcal) : "");
  }, [estimatedKcal]);

  const columns: ColumnsType<TableRow> = [
    {
      title: "Nutrition field",
      dataIndex: "name",
      key: "name",
      width: "45%",
    },
    {
      title: "Value",
      dataIndex: "value",
      key: "value",
    },
  ];

  const handleAddToPantry = async (): Promise<void> => {
    if (!pantryContext) {
      return;
    }

    if (!product.barcode?.trim()) {
      setSubmissionFeedback(null);
      setSubmissionError("This product does not have a usable barcode.");
      return;
    }

    if (!product.name?.trim()) {
      setSubmissionFeedback(null);
      setSubmissionError("This product does not have a usable name.");
      return;
    }

    if (!Number.isInteger(packageCount) || packageCount <= 0) {
      setSubmissionFeedback(null);
      setSubmissionError("Package count must be at least 1.");
      return;
    }

    const numericKcalPerPackage = Number(kcalPerPackageInput);
    if (!Number.isFinite(numericKcalPerPackage) || numericKcalPerPackage < 0) {
      setSubmissionFeedback(null);
      setSubmissionError("Calories per package must be zero or greater.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionFeedback(null);
    setSubmissionError(null);

    try {
      const payload = buildPantryItemPayload(product, packageCount, numericKcalPerPackage);
      const createdItem = await api.post<PantryItem>(
        `/households/${pantryContext.householdId}/pantry`,
        payload,
      );

      setSubmissionFeedback(
        `${createdItem.name} was added to ${pantryContext.householdName ?? `household ${pantryContext.householdId}`}.`,
      );
      setSubmissionError(null);
      onPantryItemAdded?.(createdItem);
    } catch (error) {
      setSubmissionFeedback(null);
      setSubmissionError(
        error instanceof Error ? error.message : "Failed to add the product to the pantry.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      title={
        <Space
          align="start"
          style={{ width: "100%", justifyContent: "space-between", flexWrap: "wrap" }}
        >
          <Space direction="vertical" size={0}>
            <Text strong>{product.name ?? "Unknown product"}</Text>
            {label ? <Tag color="green">{label}</Tag> : null}
          </Space>
          <Button onClick={() => exportProductAsText(product, exportContext)}>
            Export full return as TXT
          </Button>
        </Space>
      }
      style={{ width: "100%" }}
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Space
          align="start"
          size="large"
          style={{ width: "100%", justifyContent: "space-between", flexWrap: "wrap" }}
        >
          <Descriptions bordered size="small" column={1} style={{ flex: 1, minWidth: 300 }}>
            <Descriptions.Item label="Barcode">
              {product.barcode ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Brand">{product.brand ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Quantity">{product.quantity ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Serving size">
              {product.servingSize ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Nutri-Score">
              {product.nutriScore ? product.nutriScore.toUpperCase() : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Product URL">
              {product.productUrl ? (
                <a href={product.productUrl} target="_blank" rel="noopener noreferrer">
                  Open product page
                </a>
              ) : (
                "—"
              )}
            </Descriptions.Item>
          </Descriptions>

          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name ?? "Product image"}
              width={180}
              style={{ objectFit: "contain" }}
            />
          ) : null}
        </Space>

        {pantryContext ? (
          <Card size="small" title={`Add to ${pantryContext.householdName ?? `household ${pantryContext.householdId}`}`}>
            <div style={{ display: "grid", gap: 12 }}>
              <p style={{ margin: 0 }}>
                Use the product metadata as a starting point, then adjust the package count or the
                calories-per-package value before saving.
              </p>

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Package count</span>
                  <input
                    aria-label="Package count"
                    type="number"
                    min={1}
                    step={1}
                    value={packageCount}
                    onChange={(event) => setPackageCount(Number(event.target.value))}
                    style={{ padding: 8 }}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span>Calories per package</span>
                  <input
                    aria-label="Calories per package"
                    type="number"
                    min={0}
                    step="0.01"
                    value={kcalPerPackageInput}
                    onChange={(event) => setKcalPerPackageInput(event.target.value)}
                    style={{ padding: 8 }}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gap: 4 }}>
                <small>
                  Estimated from Open Food Facts: {estimatedKcal !== null ? `${estimatedKcal} kcal/package` : "no reliable estimate available"}
                </small>
                {submissionFeedback ? (
                  <small style={{ color: "green" }}>{submissionFeedback}</small>
                ) : null}
                {submissionError ? (
                  <small style={{ color: "crimson" }}>{submissionError}</small>
                ) : null}
              </div>

              <div>
                <Button type="primary" loading={isSubmitting} onClick={() => void handleAddToPantry()}>
                  Add to pantry
                </Button>
              </div>
            </div>
          </Card>
        ) : null}

        <Card size="small" title="Where it is sold / purchase place priority">
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <Text strong>Stores: </Text>
              {stores.length > 0 ? stores.map((store) => <Tag key={store}>{store}</Tag>) : <Text>—</Text>}
            </div>
            <div>
              <Text strong>Store tags: </Text>
              {storeTags.length > 0 ? storeTags.map((store) => <Tag key={store}>{store}</Tag>) : <Text>—</Text>}
            </div>
            <div>
              <Text strong>Purchase places: </Text>
              {purchasePlaces.length > 0 ? purchasePlaces.map((place) => <Tag key={place}>{place}</Tag>) : <Text>—</Text>}
            </div>
          </Space>
        </Card>

        <Card size="small" title="Nutrition priority">
          {nutritionRows.length > 0 ? (
            <Table<TableRow>
              columns={columns}
              dataSource={nutritionRows}
              rowKey="key"
              pagination={{ pageSize: 12 }}
              size="small"
            />
          ) : (
            <Empty description="No nutrition fields were returned for this item." />
          )}
        </Card>

        <Collapse
          items={[
            {
              key: "raw",
              label: rawTitle,
              children: (
                <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
                  {JSON.stringify(product.rawProduct ?? {}, null, 2)}
                </pre>
              ),
            },
            {
              key: "nutriscoreData",
              label: "Nutri-Score computation data",
              children: (
                <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
                  {JSON.stringify(product.nutriScoreData ?? {}, null, 2)}
                </pre>
              ),
            },
          ]}
        />
      </Space>
    </Card>
  );
}
