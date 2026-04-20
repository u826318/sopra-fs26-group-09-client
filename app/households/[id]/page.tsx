"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import useSessionStorage from "@/hooks/useSessionStorage";
import { usePantryWebSocket } from "@/hooks/usePantryWebSocket";
import type { HouseholdWithRole } from "@/types/household";
import type { ConsumePantryItemResponse, PantryItem, PantryOverview } from "@/types/pantry";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Form,
  InputNumber,
  Modal,
  Space,
  Table,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import { MinusCircleOutlined } from "@ant-design/icons";

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
  const { message } = App.useApp();

  const { value: username } = useSessionStorage<string>("username", "");
  const { value: token } = useSessionStorage<string>("token", "");
  const { value: cachedHouseholds } = useLocalStorage<HouseholdWithRole[]>("households", []);

  const householdId = Number(params.id);
  const [overview, setOverview] = useState<PantryOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [consumeModalOpen, setConsumeModalOpen] = useState(false);
  const [consumeTarget, setConsumeTarget] = useState<PantryItem | null>(null);
  const [consuming, setConsuming] = useState(false);
  const [consumeForm] = Form.useForm<{ quantity: number }>();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  const { connected: wsConnected, hasConnectedOnce } = usePantryWebSocket({
    householdId: Number.isFinite(householdId) && householdId > 0 ? householdId : null,
    token,
    onMessage: () => {
      void fetchPantry();
    },
  });

  const totalItemCount = useMemo(() => {
    if (!overview) {
      return 0;
    }

    return overview.items.reduce((sum, item) => {
      const count = Number(item.count);
      return sum + (Number.isFinite(count) && count > 0 ? count : 0);
    }, 0);
  }, [overview]);

  const openConsumeModal = (item: PantryItem) => {
    setConsumeTarget(item);
    consumeForm.setFieldsValue({ quantity: 1 });
    setConsumeModalOpen(true);
  };

  const submitConsumption = async () => {
    if (!consumeTarget) return;
    let values: { quantity: number };
    try {
      values = await consumeForm.validateFields();
    } catch {
      return;
    }
    if (values.quantity > consumeTarget.count) {
      message.error("Quantity cannot exceed available units.");
      return;
    }
    setConsuming(true);
    try {
      const res = await api.post<ConsumePantryItemResponse>(
        `/households/${householdId}/pantry/${consumeTarget.id}/consume`,
        { quantity: values.quantity },
      );
      message.success(
        res.removed
          ? "Item fully consumed and removed from pantry."
          : "Consumption recorded.",
      );
      setConsumeModalOpen(false);
      await fetchPantry();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Could not record consumption.");
    } finally {
      setConsuming(false);
    }
  };

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
    {
      title: "Actions",
      key: "actions",
      render: (_value, record) => (
        <Button
          size="small"
          icon={<MinusCircleOutlined />}
          onClick={() => openConsumeModal(record)}
        >
          Consume
        </Button>
      ),
    },
  ];

  return (
    <div className="card-container" style={{ padding: 24 }}>
      <Card loading={isLoading} style={{ width: "100%", maxWidth: 1200 }}>
        <div style={{ display: "grid", gap: 24, width: "100%" }}>
          {hasConnectedOnce && !wsConnected && !isLoading && (
            <Alert
              type="warning"
              showIcon
              message="Connection lost"
              description="Real-time updates are paused. Reconnecting automatically — pantry will refresh once the connection is restored."
              banner
            />
          )}

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

          <Button
            onClick={() =>
              router.push(
                `/pantry/add/scan?householdId=${householdId}&householdName=${encodeURIComponent(householdName)}`,
              )
            }
          >
            Scan product image
          </Button>

          {errorMessage ? (
            <Card>
              <Text type="danger">{errorMessage}</Text>
            </Card>
          ) : null}

          <Space size="large" wrap>
            <Card size="small" title="Items currently stored" style={{ minWidth: 220 }}>
              <Title level={3} style={{ margin: 0 }}>{totalItemCount}</Title>
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

      <Modal
        title={consumeTarget ? `Consume — ${consumeTarget.name}` : "Consume item"}
        open={consumeModalOpen}
        onCancel={() => setConsumeModalOpen(false)}
        onOk={() => void submitConsumption()}
        confirmLoading={consuming}
        okText="Log consumption"
      >
        {consumeTarget && (
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            Available: <strong>{consumeTarget.count}</strong> unit(s) ·{" "}
            {consumeTarget.kcalPerPackage.toFixed(0)} kcal each. Enter how many you consumed.
          </Paragraph>
        )}
        <Form form={consumeForm} layout="vertical">
          <Form.Item
            label="Quantity consumed"
            name="quantity"
            rules={[
              { required: true, message: "Enter quantity" },
              { type: "number", min: 1, message: "At least 1" },
            ]}
          >
            <InputNumber
              min={1}
              max={consumeTarget?.count ?? undefined}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
