"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DatePicker, Button, Card, Empty, Space, Spin, Table, Tag, Typography, App } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import type { HouseholdStats } from "@/types/stats";

const { Title, Paragraph, Text } = Typography;

function comparisonColor(status: string): string {
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

  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(6, "day"));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<HouseholdStats | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const canLoad = useMemo(() => {
    return Boolean(selectedHouseholdId && startDate && endDate);
  }, [selectedHouseholdId, startDate, endDate]);

  const loadStats = async () => {
    if (!selectedHouseholdId) {
      message.warning("Please select a household first.");
      return;
    }
    if (!startDate || !endDate) {
      message.warning("Please select both start and end dates.");
      return;
    }

    setLoading(true);
    try {
      const result = await api.get<HouseholdStats>(
        `/households/${selectedHouseholdId}/stats?startDate=${startDate.format("YYYY-MM-DD")}&endDate=${endDate.format("YYYY-MM-DD")}`,
      );
      setStats(result);
      setHasLoaded(true);
    } catch (error) {
      setStats(null);
      setHasLoaded(true);
      message.error(error instanceof Error ? error.message : "Failed to load stats.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canLoad) {
      void loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Space style={{ width: "100%", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div>
            <Title level={2} style={{ marginBottom: 0 }}>Household Statistics</Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              View average consumption, total calories, and budget comparison for the selected household.
            </Paragraph>
          </div>
          <Button onClick={() => router.push("/households")}>Back to households</Button>
        </Space>

        <Card>
          <Space wrap>
            <DatePicker
              value={startDate}
              onChange={(value) => setStartDate(value)}
              placeholder="Start date"
            />
            <DatePicker
              value={endDate}
              onChange={(value) => setEndDate(value)}
              placeholder="End date"
            />
            <Button type="primary" onClick={() => void loadStats()} loading={loading}>
              Load stats
            </Button>
          </Space>
        </Card>

        {!selectedHouseholdId ? (
          <Empty description="No household selected yet. Go to Households and choose one first." />
        ) : loading ? (
          <Card><Spin /></Card>
        ) : stats ? (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Space wrap style={{ width: "100%" }}>
              <Card style={{ minWidth: 220 }}>
                <Text type="secondary">Average daily calories</Text>
                <Title level={3} style={{ margin: 0 }}>{stats.averageDailyCalories.toFixed(1)}</Title>
              </Card>
              <Card style={{ minWidth: 220 }}>
                <Text type="secondary">Total calories consumed</Text>
                <Title level={3} style={{ margin: 0 }}>{stats.totalCaloriesConsumed.toFixed(1)}</Title>
              </Card>
              <Card style={{ minWidth: 220 }}>
                <Text type="secondary">Daily target</Text>
                <Title level={3} style={{ margin: 0 }}>
                  {stats.dailyCalorieTarget !== null ? stats.dailyCalorieTarget.toFixed(1) : "—"}
                </Title>
              </Card>
            </Space>

            <Card title="Budget comparison">
              {stats.comparisonToBudget ? (
                <Space direction="vertical">
                  <Tag color={comparisonColor(stats.comparisonToBudget.status)}>
                    {stats.comparisonToBudget.status}
                  </Tag>
                  <Text>
                    Difference from target: {stats.comparisonToBudget.differenceFromTarget.toFixed(1)}
                  </Text>
                  <Text>
                    Percentage of target: {stats.comparisonToBudget.percentageOfTarget.toFixed(1)}%
                  </Text>
                </Space>
              ) : (
                <Empty description="No household budget has been set yet." />
              )}
            </Card>

            <Card title="Daily breakdown">
              <Table
                rowKey="date"
                pagination={false}
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
          </Space>
        ) : hasLoaded ? (
          <Empty description="No stats available for the selected range." />
        ) : (
          <Empty description="Choose a date range and load household statistics." />
        )}
      </Space>
    </div>
  );
}