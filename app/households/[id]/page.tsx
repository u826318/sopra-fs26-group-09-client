"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import type { HouseholdWithRole } from "@/types/household";
import type { PantryItem, PantryOverview } from "@/types/pantry";
import { Button, Card, Empty, Space, Table, Typography } from "antd";
import type { TableProps } from "antd";

const { Title, Paragraph, Text } = Typography;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function HouseholdPantryPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const api = useApi();

  const { value: username } = useLocalStorage<string>("username", "");
  const { value: cachedHouseholds } = useLocalStorage<HouseholdWithRole[]>("households", []);

  const householdId = Number(params.id);
  const [overview, setOverview] = useState<PantryOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const householdName = useMemo(() => {
    if (typeof globalThis.window !== "undefined") {
      const params = new URLSearchParams(globalThis.location.search);
      const queryName = params.get("name");
      if (queryName?.trim()) {
        return queryName.trim();
      }
    }

    return cachedHouseholds.find((household) => household.householdId === householdId)?.name
      ?? `Household ${householdId}`;
  }, [cachedHouseholds, householdId]);

  const fetchPantry = async () => {
    if (!Number.isFinite(householdId) || householdId <= 0) {
      setErrorMessage("Invalid household id.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const pantryOverview = await api.get<PantryOverview>(`/households/${householdId}/pantry`);
      setOverview(pantryOverview);
    } catch (error) {
      setOverview(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load the household pantry.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchPantry();
  }, [householdId]);

  const columns: TableProps<PantryItem>["columns"] = [
    {
      title: "Product",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Barcode",
      dataIndex: "barcode",
      key: "barcode",
    },
    {
      title: "kcal / package",
      dataIndex: "kcalPerPackage",
      key: "kcalPerPackage",
      render: (value: number) => value.toFixed(2),
    },
    {
      title: "Count",
      dataIndex: "count",
      key: "count",
    },
    {
      title: "Total kcal",
      key: "totalKcal",
      render: (_value, record) => (record.kcalPerPackage * record.count).toFixed(2),
    },
    {
      title: "Added",
      dataIndex: "addedAt",
      key: "addedAt",
      render: (value: string) => formatDate(value),
    },
  ];

  return (
    <div className="card-container" style={{ padding: 24 }}>
      <Card loading={isLoading} style={{ width: "100%", maxWidth: 1200 }}>
        <div style={{ display: "grid", gap: 24, width: "100%" }}>
          <Space style={{ width: "100%", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              <Title level={2} style={{ marginBottom: 0 }}>{householdName}</Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Pantry overview for {username?.trim() || "the current user"}. This page is wired to
                <code> GET /households/{householdId}/pantry</code> and gives you the route anchor for
                the item creation flow.
              </Paragraph>
            </div>
            <Space wrap>
              <Button onClick={() => router.push("/households")}>Back to households</Button>
              <Button onClick={() => void fetchPantry()}>Refresh pantry</Button>
              <Button
                type="primary"
                onClick={() =>
                  router.push(
                    `/open-food-facts?householdId=${householdId}&householdName=${encodeURIComponent(householdName)}`,
                  )
                }
              >
                Add item from OFF portal
              </Button>
            </Space>
          </Space>

          {errorMessage ? (
            <Card>
              <Text type="danger">{errorMessage}</Text>
            </Card>
          ) : null}

          <Space size="large" wrap>
            <Card size="small" title="Items currently stored" style={{ minWidth: 220 }}>
              <Title level={3} style={{ margin: 0 }}>{overview?.items.length ?? 0}</Title>
            </Card>
            <Card size="small" title="Total calories in pantry" style={{ minWidth: 220 }}>
              <Title level={3} style={{ margin: 0 }}>
                {overview ? overview.totalCalories.toFixed(2) : "0.00"}
              </Title>
            </Card>
          </Space>

          {overview && overview.items.length > 0 ? (
            <Table<PantryItem>
              rowKey="id"
              dataSource={overview.items}
              columns={columns}
              pagination={{ pageSize: 8 }}
            />
          ) : (
            <Empty description="No pantry items yet. Add one from the Open Food Facts portal." />
          )}
        </div>
      </Card>
    </div>
  );
}
