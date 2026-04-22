"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import {
  EditOutlined,
  MinusCircleOutlined,
  RestOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { VirtualPantryAppShell } from "@/components/VirtualPantryAppShell";
import type { ApplicationError } from "@/types/error";
import type { HouseholdBudget } from "@/types/budget";
import type { HouseholdWithRole } from "@/types/household";
import type { ConsumptionLogEntry } from "@/types/consumption";
import type { ConsumePantryItemResponse, PantryItem, PantryOverview } from "@/types/pantry";
import type { HouseholdStats } from "@/types/stats";
import statsStyles from "@/styles/stats.module.css";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const { Title, Paragraph, Text } = Typography;

const FOREST = "#1b5e20";
const DANGER = "#c62828";
const MUTED = "#5d6a5d";

type ActivityEntry = {
  id: string;
  at: string;
  productName: string;
  deltaKcal: number;
  consumedQuantity: number;
};

function logsToActivity(logs: ConsumptionLogEntry[]): ActivityEntry[] {
  return logs.map((log) => ({
    id: `log-${log.logId}`,
    at: log.consumedAt,
    productName: log.productName,
    deltaKcal: -log.consumedCalories,
    consumedQuantity: log.consumedQuantity,
  }));
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as ApplicationError).status === 404
  );
}

function formatKcal(value: number): string {
  return `${Math.round(value).toLocaleString()} kcal`;
}

function comparisonTagColor(status: string): string {
  switch (status) {
    case "OVER_BUDGET":
      return "red";
    case "UNDER_BUDGET":
      return "blue";
    case "ON_TARGET":
      return "green";
    default:
      return "default";
  }
}

function inferCategory(name: string): { label: string; color: string } {
  const n = name.trim();
  if (/milk|cheese|yogurt|cream|butter|dairy/i.test(n)) {
    return { label: "DAIRY", color: "gold" };
  }
  if (/fruit|berry|vegetable|lettuce|tomato|produce|apple|orange/i.test(n)) {
    return { label: "PRODUCE", color: "green" };
  }
  return { label: "PANTRY", color: "cyan" };
}

export default function StatsPage() {
  useAuthGuard();
  const api = useApi();
  const router = useRouter();
  const { message } = App.useApp();

  const { value: selectedHouseholdId } = useLocalStorage<number | null>("selectedHouseholdId", null);
  const { value: cachedHouseholds } = useLocalStorage<HouseholdWithRole[]>("households", []);

  const householdRole = useMemo(() => {
    if (!selectedHouseholdId) return null;
    return cachedHouseholds.find((h) => h.householdId === selectedHouseholdId)?.role ?? null;
  }, [cachedHouseholds, selectedHouseholdId]);
  const isOwner = householdRole === "owner";

  const [startDate, setStartDate] = useState<Dayjs | null>(() => dayjs().subtract(7, "day"));
  const [loading, setLoading] = useState(false);
  const [pantry, setPantry] = useState<PantryOverview | null>(null);
  const [stats, setStats] = useState<HouseholdStats | null>(null);
  const [budgetRecord, setBudgetRecord] = useState<HouseholdBudget | null>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetForm] = Form.useForm<{ dailyCalorieTarget: number }>();

  const [consumeModalOpen, setConsumeModalOpen] = useState(false);
  const [consuming, setConsuming] = useState(false);
  const [consumeForm] = Form.useForm<{ itemId: number; quantity: number }>();
  const selectedConsumeItemId = Form.useWatch("itemId", consumeForm);
  const selectedConsumeItem = useMemo(
    () => pantry?.items.find((i) => i.id === selectedConsumeItemId),
    [pantry?.items, selectedConsumeItemId],
  );
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  const loadDashboard = useCallback(async () => {
    if (!selectedHouseholdId || !startDate) {
      return;
    }

    const endStr = dayjs().format("YYYY-MM-DD");
    const startStr = startDate.format("YYYY-MM-DD");

    setLoading(true);
    try {
      const [pantryRes, statsRes, logsRes] = await Promise.all([
        api.get<PantryOverview>(`/households/${selectedHouseholdId}/pantry`),
        api.get<HouseholdStats>(
          `/households/${selectedHouseholdId}/stats?startDate=${startStr}&endDate=${endStr}`,
        ),
        api.get<ConsumptionLogEntry[]>(
          `/households/${selectedHouseholdId}/consumption-logs?limit=30`,
        ),
      ]);
      setPantry(pantryRes);
      setStats(statsRes);
      setActivity(logsToActivity(logsRes));

      try {
        const b = await api.get<HouseholdBudget>(`/households/${selectedHouseholdId}/budget`);
        setBudgetRecord(b);
      } catch (error) {
        if (isNotFound(error)) {
          setBudgetRecord(null);
        } else {
          throw error;
        }
      }
    } catch (error) {
      setPantry(null);
      setStats(null);
      setBudgetRecord(null);
      setActivity([]);
      message.error(error instanceof Error ? error.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [api, message, selectedHouseholdId, startDate]);

  useEffect(() => {
    if (selectedHouseholdId && startDate) {
      void loadDashboard();
    }
  }, [loadDashboard, selectedHouseholdId, startDate]);

  const todayStr = dayjs().format("YYYY-MM-DD");
  const dailyGoal = stats?.dailyCalorieTarget ?? budgetRecord?.dailyCalorieTarget ?? null;
  const actualToday = useMemo(() => {
    if (!stats?.dailyBreakdown?.length) return 0;
    const row = stats.dailyBreakdown.find((d) => d.date === todayStr);
    return row?.caloriesConsumed ?? 0;
  }, [stats, todayStr]);

  const todayVsGoalPercent = useMemo(() => {
    if (dailyGoal === null || dailyGoal <= 0) return 0;
    return (actualToday / dailyGoal) * 100;
  }, [actualToday, dailyGoal]);

  const todayOverLabel = useMemo(() => {
    if (dailyGoal === null || dailyGoal <= 0) return null;
    if (actualToday <= dailyGoal) return null;
    const pct = ((actualToday / dailyGoal) * 100 - 100).toFixed(0);
    return `+${pct}% OVER BUDGET (today)`;
  }, [actualToday, dailyGoal]);

  const openBudgetModal = () => {
    const initial = dailyGoal ?? 2200;
    budgetForm.setFieldsValue({ dailyCalorieTarget: initial });
    setBudgetModalOpen(true);
  };

  const submitBudget = async () => {
    if (!selectedHouseholdId) return;
    const values = await budgetForm.validateFields();
    setSavingBudget(true);
    try {
      const updated = await api.put<HouseholdBudget>(`/households/${selectedHouseholdId}/budget`, {
        dailyCalorieTarget: values.dailyCalorieTarget,
      });
      setBudgetRecord(updated);
      message.success("Budget saved.");
      setBudgetModalOpen(false);
      await loadDashboard();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Could not save budget.");
    } finally {
      setSavingBudget(false);
    }
  };

  const openConsumeModal = () => {
    if (!pantry?.items.length) {
      message.info("Add items to your pantry before recording consumption.");
      return;
    }
    const first = pantry.items[0];
    consumeForm.setFieldsValue({ itemId: first.id, quantity: 1 });
    setConsumeModalOpen(true);
  };

  const submitConsumption = async () => {
    if (!selectedHouseholdId) return;
    const values = await consumeForm.validateFields();
    const item = pantry?.items.find((i) => i.id === values.itemId);
    if (!item) {
      message.error("Selected item is no longer in the pantry.");
      return;
    }
    if (values.quantity > item.count) {
      message.error("Quantity cannot exceed available units.");
      return;
    }
    setConsuming(true);
    try {
      const res = await api.post<ConsumePantryItemResponse>(
        `/households/${selectedHouseholdId}/pantry/${values.itemId}/consume`,
        { quantity: values.quantity },
      );
      message.success(
        res.removed
          ? "Item fully consumed and removed from pantry."
          : "Consumption recorded.",
      );
      setConsumeModalOpen(false);

      await loadDashboard();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Could not record consumption.");
    } finally {
      setConsuming(false);
    }
  };

  const inventoryColumns: TableProps<PantryItem>["columns"] = useMemo(
    () => [
      {
        title: "Product",
        dataIndex: "name",
        key: "name",
        render: (name: string) => (
          <Text strong style={{ color: "#1b2a1b" }}>
            {name}
          </Text>
        ),
      },
      {
        title: "Category",
        key: "category",
        width: 120,
        render: (_: unknown, record: PantryItem) => {
          const { label, color } = inferCategory(record.name);
          return (
            <Tag className={statsStyles.categoryTag} color={color}>
              {label}
            </Tag>
          );
        },
      },
      {
        title: "Quantity",
        key: "count",
        width: 110,
        render: (_: unknown, record: PantryItem) => (
          <span>
            {record.count} × unit
          </span>
        ),
      },
      {
        title: "Calories",
        key: "cals",
        width: 120,
        render: (_: unknown, record: PantryItem) => (
          <Text strong>{Math.round(record.kcalPerPackage * record.count).toLocaleString()} kcal</Text>
        ),
      },
      {
        title: "Status",
        key: "status",
        width: 120,
        render: (_: unknown, record: PantryItem) =>
          record.count <= 2 ? (
            <Tag color="orange">Low stock</Tag>
          ) : (
            <Tag color="success">In stock</Tag>
          ),
      },
    ],
    [],
  );

  return (
    <VirtualPantryAppShell activeNav="pantry">
      <div className={statsStyles.pageHeader}>
        <Title level={2} className={statsStyles.pageTitle}>
          Pantry Overview
        </Title>
        <Paragraph className={statsStyles.pageSubtitle}>
          Energy reservoir, consumption flow, and budget control — with current inventory and a record of
          what you use from the pantry.
        </Paragraph>
      </div>

      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        {!selectedHouseholdId ? (
          <div className={statsStyles.emptyWrap}>
            <Empty description="No household selected. Open Households and pick one first." />
          </div>
        ) : loading && !stats ? (
          <Card className={statsStyles.spinCard}>
            <Spin size="large" />
          </Card>
        ) : (
          <>
            <Row gutter={[20, 20]} className={statsStyles.metricGrid}>
              <Col xs={24} md={8}>
                <Card
                  className={statsStyles.metricCard}
                  title={<span className={statsStyles.cardTitle}>Energy reservoir</span>}
                  variant="borderless"
                >
                  <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                    <div className={statsStyles.metricLead}>Total nutritional value in your pantry</div>
                    <Title level={3} className={statsStyles.metricValue}>
                      {pantry ? formatKcal(pantry.totalCalories) : "—"}
                    </Title>
                    <Text className={statsStyles.metricFootnote}>
                      {pantry
                        ? `${pantry.items.length} item(s) currently in your digital atelier.`
                        : ""}
                    </Text>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card
                  className={statsStyles.metricCard}
                  title={<span className={statsStyles.cardTitle}>Consumption flow</span>}
                  extra={
                    <DatePicker
                      value={startDate}
                      onChange={(v) => setStartDate(v)}
                      allowClear={false}
                      size="small"
                    />
                  }
                  variant="borderless"
                >
                  <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                    <div className={statsStyles.metricLead}>Daily average since start date</div>
                    <Title level={3} className={statsStyles.metricValue}>
                      {stats
                        ? `${Math.round(stats.averageDailyCalories).toLocaleString()} kcal / day`
                        : "—"}
                    </Title>
                    {stats && startDate ? (
                      <Text className={statsStyles.metricFootnote}>
                        From {startDate.format("MMM D, YYYY")} to {dayjs(stats.endDate).format("MMM D, YYYY")}
                      </Text>
                    ) : null}
                  </Space>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card
                  className={statsStyles.metricCard}
                  title={<span className={statsStyles.cardTitle}>Budget control</span>}
                  extra={
                    isOwner ? (
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={openBudgetModal}
                        aria-label="Edit daily calorie budget"
                        style={{ color: FOREST, fontWeight: 600 }}
                      >
                        Edit
                      </Button>
                    ) : null
                  }
                  variant="borderless"
                >
                  <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                    <div>
                      <Text style={{ color: MUTED }}>Daily goal</Text>
                      <div>
                        <Text strong style={{ fontSize: 16, color: "#1b2a1b" }}>
                          {dailyGoal !== null ? formatKcal(dailyGoal) : "Not set"}
                        </Text>
                      </div>
                    </div>
                    <div>
                      <Text style={{ color: MUTED }}>Actual today</Text>
                      <div>
                        <Text
                          strong
                          style={{
                            fontSize: 16,
                            color: todayVsGoalPercent > 100 ? DANGER : FOREST,
                          }}
                        >
                          {stats ? formatKcal(actualToday) : "—"}
                        </Text>
                      </div>
                    </div>

                    {dailyGoal !== null && dailyGoal > 0 ? (
                      <>
                        <Progress
                          percent={Math.min(Math.round(todayVsGoalPercent), 100)}
                          status={todayVsGoalPercent > 100 ? "exception" : "active"}
                          strokeColor={todayVsGoalPercent > 100 ? DANGER : FOREST}
                          railColor="#e8efe4"
                          showInfo
                          format={(p) => `${p ?? 0}% of daily goal (today)`}
                        />
                        {todayOverLabel ? (
                          <Tag color="error" icon={<WarningOutlined />}>
                            {todayOverLabel}
                          </Tag>
                        ) : null}
                      </>
                    ) : (
                      <Text style={{ color: MUTED }}>
                        Set a daily calorie budget to enable comparisons.
                      </Text>
                    )}

                    {stats?.comparisonToBudget ? (
                      <div>
                        <Text style={{ fontSize: 12, color: MUTED }}>Period average vs budget:</Text>
                        <div style={{ marginTop: 6 }}>
                          <Tag color={comparisonTagColor(stats.comparisonToBudget.status)}>
                            {stats.comparisonToBudget.status.replace(/_/g, " ")}
                          </Tag>
                          <Text style={{ marginLeft: 8, color: "#3d4f3d" }}>
                            Avg {stats.averageDailyCalories.toFixed(0)} vs target{" "}
                            {stats.dailyCalorieTarget?.toFixed(0) ?? "—"} kcal/day
                          </Text>
                        </div>
                      </div>
                    ) : null}
                  </Space>
                </Card>
              </Col>
            </Row>

            <Row gutter={[20, 20]} className={statsStyles.lowerSection}>
              <Col xs={24} lg={15}>
                <Card
                  className={statsStyles.panelCard}
                  title="Current inventory"
                  variant="borderless"
                >
                  {pantry && pantry.items.length > 0 ? (
                    <Table<PantryItem>
                      rowKey="id"
                      pagination={{ pageSize: 8, showSizeChanger: false }}
                      size="small"
                      dataSource={pantry.items}
                      columns={inventoryColumns}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No pantry items yet."
                    >
                      {selectedHouseholdId ? (
                        <Button
                          type="primary"
                          onClick={() =>
                            router.push(
                              `/open-food-facts?householdId=${selectedHouseholdId}&householdName=${encodeURIComponent(
                                cachedHouseholds.find((h) => h.householdId === selectedHouseholdId)?.name ?? `Household ${selectedHouseholdId}`,
                              )}`,
                            )
                          }
                        >
                          Add from Open Food Facts
                        </Button>
                      ) : null}
                    </Empty>
                  )}
                </Card>
              </Col>
              <Col xs={24} lg={9}>
                <div className={statsStyles.rightStack}>
                  <Button
                    type="primary"
                    className={statsStyles.recordConsumptionBtn}
                    icon={<RestOutlined />}
                    onClick={openConsumeModal}
                  >
                    Record consumption
                  </Button>

                  <Card className={`${statsStyles.panelCard} ${statsStyles.activityCard}`} title="Recent activity" variant="borderless">
                    {activity.length === 0 ? (
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        No consumption recorded yet, or logs are still loading.
                      </Text>
                    ) : (
                      <div className={statsStyles.activityList}>
                        {activity.map((a) => (
                          <div key={a.id} className={statsStyles.activityItem}>
                            <div>
                              <Space size={8}>
                                <MinusCircleOutlined style={{ color: DANGER }} />
                                <Text strong style={{ color: "#1b2a1b" }}>
                                  Consumed {a.consumedQuantity}× {a.productName}
                                </Text>
                              </Space>
                              <div className={statsStyles.activityMeta}>
                                {dayjs(a.at).format("MMM D, YYYY · HH:mm")}
                              </div>
                            </div>
                            <span className={`${statsStyles.activityDelta} ${statsStyles.deltaNeg}`}>
                              {Math.round(a.deltaKcal).toLocaleString()} kcal
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              </Col>
            </Row>

            {stats ? (
              <Card title="Daily breakdown" className={statsStyles.breakdownCard}>
                <Table
                  rowKey="date"
                  pagination={false}
                  size="small"
                  dataSource={stats.dailyBreakdown}
                  columns={[
                    { title: "Date", dataIndex: "date", key: "date" },
                    {
                      title: "Calories consumed",
                      dataIndex: "caloriesConsumed",
                      key: "caloriesConsumed",
                      render: (value: number) => value.toFixed(1),
                    },
                  ]}
                />
              </Card>
            ) : null}
          </>
        )}
      </Space>

      <Modal
        title="Daily calorie budget"
        open={budgetModalOpen}
        onCancel={() => setBudgetModalOpen(false)}
        onOk={() => void submitBudget()}
        confirmLoading={savingBudget}
        okText="Save"
        destroyOnHidden
      >
        <Paragraph type="secondary">
          Set the ideal total calories your household aims to consume per day. Only the household owner can
          change this.
        </Paragraph>
        <Form form={budgetForm} layout="vertical">
          <Form.Item
            label="Daily calorie target"
            name="dailyCalorieTarget"
            rules={[
              { required: true, message: "Enter a calorie target" },
              {
                type: "number",
                min: 1,
                max: 50000,
                message: "Enter a value between 1 and 50000",
              },
            ]}
          >
            <InputNumber min={1} max={50000} style={{ width: "100%" }} addonAfter="kcal / day" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Record consumption"
        open={consumeModalOpen}
        onCancel={() => setConsumeModalOpen(false)}
        onOk={() => void submitConsumption()}
        confirmLoading={consuming}
        okText="Log consumption"
        destroyOnHidden
      >
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Select an item and how many units you used. Calories are calculated from each item&apos;s
          kcal per package.
        </Paragraph>
        <Form form={consumeForm} layout="vertical">
          <Form.Item
            label="Pantry item"
            name="itemId"
            rules={[{ required: true, message: "Select an item" }]}
          >
            <Select
              placeholder="Choose item"
              options={pantry?.items.map((i) => ({
                value: i.id,
                label: `${i.name} (${i.count} available)`,
              }))}
              onChange={() => consumeForm.setFieldValue("quantity", 1)}
            />
          </Form.Item>
          <Form.Item
            label="Quantity consumed"
            name="quantity"
            rules={[
              { required: true, message: "Enter quantity" },
              {
                type: "number",
                min: 1,
                message: "At least 1",
              },
            ]}
          >
            <InputNumber
              min={1}
              max={selectedConsumeItem?.count ?? undefined}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </VirtualPantryAppShell>
  );
}
