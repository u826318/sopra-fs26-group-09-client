"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import type { Product } from "@/types/product";
import ProductResultCard from "@/components/products/ProductResultCard";
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Space,
  Typography,
} from "antd";

const { Title, Paragraph } = Typography;

export default function LocalDatabasePortalPage() {
  const router = useRouter();
  const api = useApi();

  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Product | null>(null);

  const lookupBarcode = async () => {
    setLoading(true);
    try {
      const product = await api.get<Product>(
        `/products/local/lookup?barcode=${encodeURIComponent(barcode)}`,
      );
      setResult(product);
    } catch (error) {
      setResult(null);
      alert(error instanceof Error ? error.message : "Local database lookup failed.");
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
                Local OFF dataset portal
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Look up a product by barcode against the local Open Food Facts dataset.
              </Paragraph>
            </div>
            <Space wrap>
              <Button onClick={() => router.push("/")}>Home</Button>
              <Button onClick={() => router.push("/open-food-facts")}>API portal</Button>
              <Button type="primary" onClick={() => router.push("/users")}>Users</Button>
            </Space>
          </Space>

          <Form layout="vertical">
            <Form.Item label="Barcode">
              <Input
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                placeholder="e.g. 90331701"
              />
            </Form.Item>
            <Space orientation="vertical" size="small" style={{ width: "100%" }}>
              <Button type="primary" loading={loading} onClick={() => void lookupBarcode()}>
                Look up barcode in local dataset
              </Button>
            </Space>
          </Form>

          {result ? (
            <ProductResultCard
              product={result}
              label="Local dataset result"
              rawTitle="All raw product fields returned by the database row"
              exportContext={`Local OFF dataset barcode lookup
Dataset source: fixed backend JSONL.GZ dataset`}
            />
          ) : (
            <Empty description="No local dataset result yet." />
          )}
        </Space>
      </Card>
    </div>
  );
}
