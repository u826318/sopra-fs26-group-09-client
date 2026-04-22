"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import type { HouseholdWithRole } from "@/types/household";
import type { PantryItem, PantryOverview } from "@/types/pantry";
import {
  Button,
  Card,
  Empty,
  Space,
  Table,
  Typography,
  Alert,
  Row,
  Col,
  Tag,
} from "antd";
import type { TableProps } from "antd";
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  SearchOutlined,
  CameraOutlined,
  InboxOutlined,
  FireOutlined,
} from "@ant-design/icons";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const { Title, Paragraph, Text } = Typography;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export default function HouseholdPantryPage() {
  const { isAuthenticated } = useAuthGuard();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const api = useApi();

  const { value: username } = useLocalStorage<string>("username", "");
  const { value: cachedHouseholds } = useLocalStorage<HouseholdWithRole[]>(
    "households",
    [],
  );

  const householdId = Number(params.id);
  const [overview, setOverview] = useState<PantryOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const householdName = useMemo(() => {
    if (typeof globalThis.window !== "undefined") {
      const queryParams = new URLSearchParams(globalThis.location.search);
      const queryName = queryParams.get("name");
      if (queryName?.trim()) {
        return queryName.trim();
      }
    }

    return (
      cachedHouseholds.find((household) => household.householdId === householdId)
        ?.name ?? `Household ${householdId}`
    );
  }, [cachedHouseholds, householdId]);

  const fetchPantry = useCallback(async () => {
    if (!Number.isFinite(householdId) || householdId <= 0) {
      setErrorMessage("Invalid household id.");
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    setErrorMessage(null);

    try {
      const pantryOverview = await api.get<PantryOverview>(
        `/households/${householdId}/pantry`,
      );
      setOverview(pantryOverview);
    } catch (error) {
      setOverview(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load the household pantry.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [api, householdId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchPantry();
  }, [fetchPantry, isAuthenticated]);

  const totalItemCount = useMemo(() => {
    if (!overview) {
      return 0;
    }

    return overview.items.reduce((sum, item) => {
      const count = Number(item.count);
      return sum + (Number.isFinite(count) && count > 0 ? count : 0);
    }, 0);
  }, [overview]);

  const uniqueProductsCount = overview?.items.length ?? 0;

  const columns: TableProps<PantryItem>["columns"] = [
    {
      title: "Product",
      dataIndex: "name",
      key: "name",
      render: (value: string) => <Text strong>{value || "Unnamed item"}</Text>,
    },
    {
      title: "Barcode",
      dataIndex: "barcode",
      key: "barcode",
      render: (value: string | null) => value || "—",
    },
    {
      title: "kcal / package",
      dataIndex: "kcalPerPackage",
      key: "kcalPerPackage",
      render: (value: number) => formatNumber(Number(value ?? 0)),
    },
    {
      title: "Count",
      dataIndex: "count",
      key: "count",
      render: (value: number) => formatNumber(Number(value ?? 0)),
    },
    {
      title: "Total kcal",
      key: "totalKcal",
      render: (_value, record) =>
        formatNumber(
          Number(record.kcalPerPackage ?? 0) * Number(record.count ?? 0),
        ),
    },
    {
      title: "Added",
      dataIndex: "addedAt",
      key: "addedAt",
      render: (value: string) => formatDate(value),
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6ee",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Space
          direction="vertical"
          size="large"
          style={{ width: "100%", display: "flex" }}
        >
          <Card
            loading={isLoading}
            style={{
              borderRadius: 24,
              borderColor: "#d9e2cf",
              background: "#ffffff",
              boxShadow: "0 8px 24px rgba(24, 36, 24, 0.06)",
            }}
            styles={{
              body: {
                padding: 32,
              },
            }}
          >
            <Space
              direction="vertical"
              size="large"
              style={{ width: "100%", display: "flex" }}
            >
              <Space
                style={{
                  width: "100%",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div>
                  <Tag
                    color="green"
                    style={{
                      marginBottom: 12,
                      borderRadius: 999,
                      paddingInline: 12,
                      fontWeight: 600,
                    }}
                  >
                    Household pantry
                  </Tag>
                  <Title
                    level={1}
                    style={{
                      margin: 0,
                      color: "#18351f",
                      fontSize: 48,
                      lineHeight: 1.05,
                    }}
                  >
                    {householdName}
                  </Title>
                  <Paragraph
                    style={{
                      marginTop: 12,
                      marginBottom: 0,
                      maxWidth: 760,
                      fontSize: 20,
                      lineHeight: 1.55,
                      color: "#5f6e60",
                    }}
                  >
                    Pantry overview for {username?.trim() || "the current user"}.
                    Add products through Open Food Facts or use the barcode scan
                    flow for faster household inventory updates.
                  </Paragraph>
                </div>

                <Space wrap size="middle">
                  <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => router.push("/households")}
                    size="large"
                  >
                    Back to households
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    size="large"
                    loading={isRefreshing}
                    onClick={() => {
                      setIsRefreshing(true);
                      void fetchPantry();
                    }}
                  >
                    Refresh pantry
                  </Button>
                </Space>
              </Space>

              {errorMessage ? (
                <Alert
                  type="error"
                  showIcon
                  message="Pantry data could not be loaded"
                  description={errorMessage}
                />
              ) : null}

              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <Card
                    size="small"
                    style={{
                      borderRadius: 20,
                      borderColor: "#d9e2cf",
                      background: "#ffffff",
                      height: "100%",
                    }}
                  >
                    <Space direction="vertical" size={8}>
                      <Text
                        style={{
                          color: "#1f7a3f",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        <InboxOutlined /> Inventory size
                      </Text>
                      <Title level={2} style={{ margin: 0, color: "#18351f" }}>
                        {formatNumber(totalItemCount)}
                      </Title>
                      <Text type="secondary">
                        Item units currently stored in this shared pantry.
                      </Text>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} md={8}>
                  <Card
                    size="small"
                    style={{
                      borderRadius: 20,
                      borderColor: "#d9e2cf",
                      background: "#ffffff",
                      height: "100%",
                    }}
                  >
                    <Space direction="vertical" size={8}>
                      <Text
                        style={{
                          color: "#1f7a3f",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        <FireOutlined /> Total calories
                      </Text>
                      <Title level={2} style={{ margin: 0, color: "#18351f" }}>
                        {overview ? formatNumber(overview.totalCalories) : "0"} kcal
                      </Title>
                      <Text type="secondary">
                        Aggregate nutritional value across all pantry items.
                      </Text>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} md={8}>
                  <Card
                    size="small"
                    style={{
                      borderRadius: 20,
                      borderColor: "#d9e2cf",
                      background: "#ffffff",
                      height: "100%",
                    }}
                  >
                    <Space direction="vertical" size={8}>
                      <Text
                        style={{
                          color: "#1f7a3f",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        Distinct products
                      </Text>
                      <Title level={2} style={{ margin: 0, color: "#18351f" }}>
                        {formatNumber(uniqueProductsCount)}
                      </Title>
                      <Text type="secondary">
                        Unique product entries currently visible in the pantry.
                      </Text>
                    </Space>
                  </Card>
                </Col>
              </Row>

              <Card
                style={{
                  borderRadius: 24,
                  borderColor: "#d9e2cf",
                  background: "linear-gradient(180deg, #fbfcf7 0%, #f3f6ec 100%)",
                }}
                styles={{ body: { padding: 24 } }}
              >
                <Space
                  direction="vertical"
                  size="middle"
                  style={{ width: "100%", display: "flex" }}
                >
                  <Title level={3} style={{ margin: 0, color: "#18351f" }}>
                    Add products to pantry
                  </Title>
                  <Paragraph style={{ margin: 0, color: "#5f6e60" }}>
                    Choose how you want to add the next item. Use Open Food Facts
                    for direct barcode or name lookup, or scan a package image to
                    detect the barcode automatically.
                  </Paragraph>

                  <Space wrap size="middle">
                    <Button
                      type="primary"
                      size="large"
                      icon={<SearchOutlined />}
                      onClick={() =>
                        router.push(
                          `/open-food-facts?householdId=${householdId}&householdName=${encodeURIComponent(
                            householdName,
                          )}`,
                        )
                      }
                    >
                      Add item from OFF portal
                    </Button>

                    <Button
                      size="large"
                      icon={<CameraOutlined />}
                      onClick={() =>
                        router.push(
                          `/pantry/add/scan?householdId=${householdId}&householdName=${encodeURIComponent(
                            householdName,
                          )}`,
                        )
                      }
                    >
                      Scan product image
                    </Button>
                  </Space>
                </Space>
              </Card>

              <Card
                title={
                  <span style={{ fontSize: 28, fontWeight: 700, color: "#1f2d1f" }}>
                    Current inventory
                  </span>
                }
                style={{
                  borderRadius: 24,
                  borderColor: "#d9e2cf",
                  background: "#ffffff",
                }}
                styles={{
                  header: {
                    borderBottomColor: "#e5ecda",
                    paddingInline: 24,
                    paddingTop: 20,
                    paddingBottom: 16,
                  },
                  body: {
                    padding: 24,
                  },
                }}
              >
                {overview && overview.items.length > 0 ? (
                  <Table<PantryItem>
                    rowKey="id"
                    dataSource={overview.items}
                    columns={columns}
                    pagination={{ pageSize: 8 }}
                    scroll={{ x: 900 }}
                  />
                ) : (
                  <Empty description="No pantry items yet. Add products from Open Food Facts or use the scan flow." />
                )}
              </Card>
            </Space>
          </Card>
        </Space>
      </div>
    </div>
  );
}