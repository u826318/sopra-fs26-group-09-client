"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { EditOutlined, WarningOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import type { ApplicationError } from "@/types/error";
import type { HouseholdBudget } from "@/types/budget";
import type { HouseholdWithRole } from "@/types/household";
import type { PantryOverview } from "@/types/pantry";
import type { HouseholdStats } from "@/types/stats";

const { Title, Paragraph, Text } = Typography;

const ACCENT = "#16a34a";
const DANGER = "#dc2626";

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

export default function StatsPage() {
  const router = useRouter();
  const api = useApi();
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

  const loadDashboard = useCallback(async () => {
    if (!selectedHouseholdId || !startDate) {
      return;
    }

    const endStr = dayjs().format("YYYY-MM-DD");
    const startStr = startDate.format("YYYY-MM-DD");

    setLoading(true);
    try {
      const [pantryRes, statsRes] = await Promise.all([
        api.get<PantryOverview>(`/households/${selectedHouseholdId}/pantry`),
        api.get<HouseholdStats>(
          `/households/${selectedHouseholdId}/stats?startDate=${startStr}&endDate=${endStr}`,
        ),
      ]);
      setPantry(pantryRes);
      setStats(statsRes);

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

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col flex="auto">
            <Title level={2} style={{ marginBottom: 4 }}>
              Calorie Management
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Monitor pantry energy, average consumption since a start date, and budget vs actuals for
              your household.
            </Paragraph>
          </Col>
          <Col>
            <Button onClick={() => router.push("/households")}>Back to households</Button>
          </Col>
        </Row>

        {!selectedHouseholdId ? (
          <Empty description="No household selected. Open Households and pick one first." />
        ) : loading && !stats ? (
          <Card>
            <Spin size="large" />
          </Card>
        ) : (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Card
                  title={
                    <span style={{ color: ACCENT, fontWeight: 600 }}>Energy Reservoir</span>
                  }
                  variant="borderless"
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${ACCENT}33`,
                    minHeight: 200,
                  }}
                >
                  <Space direction="vertical" size="small" style={{ width: "100%" }}>
                    <Text type="secondary">Total calories stored in pantry</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {pantry ? formatKcal(pantry.totalCalories) : "—"}
                    </Title>
                    <Text type="secondary">
                      {pantry ? `${pantry.items.length} item(s)` : ""}
                    </Text>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card
                  title={
                    <span style={{ color: ACCENT, fontWeight: 600 }}>Daily Average</span>
                  }
                  extra={
                    <DatePicker
                      value={startDate}
                      onChange={(v) => setStartDate(v)}
                      allowClear={false}
                      size="small"
                    />
                  }
                  variant="borderless"
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${ACCENT}33`,
                    minHeight: 200,
                  }}
                >
                  <Space direction="vertical" size="small" style={{ width: "100%" }}>
                    <Text type="secondary">Average consumed per day</Text>
                    <Title level={3} style={{ margin: 0 }}>
                      {stats ? `${Math.round(stats.averageDailyCalories).toLocaleString()} kcal / day` : "—"}
                    </Title>
                    {stats && startDate ? (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Calculated from {startDate.format("MMM D, YYYY")} to present (
                        {dayjs(stats.endDate).format("MMM D, YYYY")})
                      </Text>
                    ) : null}
                  </Space>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card
                  title={
                    <span style={{ color: ACCENT, fontWeight: 600 }}>Budget Control</span>
                  }
                  extra={
                    isOwner ? (
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={openBudgetModal}
                        aria-label="Edit daily calorie budget"
                      >
                        Edit
                      </Button>
                    ) : null
                  }
                  variant="borderless"
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${ACCENT}33`,
                    minHeight: 200,
                  }}
                >
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <div>
                      <Text type="secondary">Daily goal</Text>
                      <div>
                        <Text strong>
                          {dailyGoal !== null ? formatKcal(dailyGoal) : "Not set"}
                        </Text>
                      </div>
                    </div>
                    <div>
                      <Text type="secondary">Actual today</Text>
                      <div>
                        <Text strong style={{ color: todayVsGoalPercent > 100 ? DANGER : undefined }}>
                          {stats ? formatKcal(actualToday) : "—"}
                        </Text>
                      </div>
                    </div>

                    {dailyGoal !== null && dailyGoal > 0 ? (
                      <>
                        <Progress
                          percent={Math.min(Math.round(todayVsGoalPercent), 100)}
                          status={todayVsGoalPercent > 100 ? "exception" : "active"}
                          strokeColor={todayVsGoalPercent > 100 ? DANGER : ACCENT}
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
                      <Text type="secondary">Set a daily calorie budget to enable comparisons.</Text>
                    )}

                    {stats?.comparisonToBudget ? (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Period average vs budget:
                        </Text>
                        <div>
                          <Tag color={comparisonTagColor(stats.comparisonToBudget.status)}>
                            {stats.comparisonToBudget.status.replace(/_/g, " ")}
                          </Tag>
                          <Text style={{ marginLeft: 8 }}>
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

            {stats ? (
              <Card title="Daily breakdown" style={{ borderRadius: 12 }}>
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
        destroyOnClose
      >
        <Paragraph type="secondary">
          Set the ideal total calories your household aims to consume per day. Only the household
          owner can change this.
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
            <InputNumber
              min={1}
              max={50000}
              style={{ width: "100%" }}
              addonAfter="kcal / day"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
