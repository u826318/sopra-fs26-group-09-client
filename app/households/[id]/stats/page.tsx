"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Radio,
} from "antd";
import type { TableProps } from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
  RestOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useSessionStorage from "@/hooks/useSessionStorage";
import { usePantryWebSocket } from "@/hooks/usePantryWebSocket";
import { VirtualPantryAppShell } from "@/components/VirtualPantryAppShell";
import type { ApplicationError } from "@/types/error";
import type { HouseholdBudget } from "@/types/budget";
import type { HouseholdWithRole } from "@/types/household";
import type { ConsumptionLogEntry } from "@/types/consumption";
import type { ConsumePantryItemResponse, PantryItem, PantryOverview } from "@/types/pantry";
import type { HouseholdStats } from "@/types/stats";
import type { HealthGoal } from "@/types/healthGoal";
import statsStyles from "@/styles/stats.module.css";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const { Title, Paragraph, Text } = Typography;

const FOREST = "#1b5e20";
const DANGER = "#c62828";
const MUTED = "#5d6a5d";

type HouseholdLookup = {
  householdId: number;
  name: string;
};

function routeBackToSafeHouseholdsPage(router: ReturnType<typeof useRouter>) {
  if (globalThis.window?.history.length > 1) {
    router.back();
    return;
  }

  router.replace("/households");
}

type ActivityEntry = {
  id: string;
  at: string;
  productName: string;
  deltaKcal: number | null;
  quantity: number;
  type: "ADDED" | "CONSUMED";
};

function logsToActivity(logs: ConsumptionLogEntry[]): ActivityEntry[] {
  return logs.map((log) => ({
    id: `consume-${log.logId}`,
    at: log.consumedAt,
    productName: log.productName,
    deltaKcal: log.consumedCalories != null ? -log.consumedCalories : null,
    quantity: log.consumedQuantity,
    type: "CONSUMED",
  }));
}

function pantryItemsToActivity(items: PantryItem[]): ActivityEntry[] {
  return items
    .filter((item) => Boolean(item.addedAt))
    .map((item) => ({
      id: `add-${item.id}`,
      at: item.addedAt,
      productName: item.name,
      deltaKcal: item.kcalPerPackage * item.count,
      quantity: item.count,
      type: "ADDED",
    }));
}

function buildRecentActivity(items: PantryItem[], logs: ConsumptionLogEntry[]): ActivityEntry[] {
  return [...pantryItemsToActivity(items), ...logsToActivity(logs)]
    .sort((a, b) => dayjs(b.at).valueOf() - dayjs(a.at).valueOf())
    .slice(0, 30);
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

function isKnownCalories(value: number | null | undefined): value is number {
  return Number.isFinite(value) && Number(value) > 0;
}

function formatKcalDisplay(value: number | null | undefined): string {
  return isKnownCalories(value) ? formatKcal(Number(value)) : "—";
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

const DAIRY_CATEGORY_KEYWORDS = ["milk", "cheese", "yogurt", "cream", "butter", "dairy"];
const PRODUCE_CATEGORY_KEYWORDS = ["fruit", "berry", "vegetable", "lettuce", "tomato", "produce", "apple", "orange"];

function includesCategoryKeyword(value: string, keywords: string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword));
}

function inferCategory(name: string): { label: string; color: string } {
  const n = name.trim().toLowerCase();
  if (includesCategoryKeyword(n, DAIRY_CATEGORY_KEYWORDS)) {
    return { label: "DAIRY", color: "gold" };
  }
  if (includesCategoryKeyword(n, PRODUCE_CATEGORY_KEYWORDS)) {
    return { label: "PRODUCE", color: "green" };
  }
  return { label: "PANTRY", color: "cyan" };
}

type UnknownConsumeMode = "suggested" | "manual" | "skip";

type UnknownConsumeState = {
  item: PantryItem;
  suggestedCalories: number | null;
  mode: UnknownConsumeMode;
  manualCalories: number | null;
};

function estimateSuggestedCalories(item: PantryItem): number | null {
  const name = item.name.trim().toLowerCase();
  const barcode = (item.barcode ?? "").toLowerCase();

  const pick = (value: number) => Math.round(value);

  if (name.includes("milk")) return pick(640);
  if (name.includes("egg")) return pick(700);
  if (name.includes("apple juice")) return pick(460);
  if (name.includes("orange juice")) return pick(450);
  if (name.includes("basmati rice") || name.includes("rice")) return pick(1800);
  if (name.includes("oats")) return pick(1850);
  if (name.includes("granola")) return pick(2250);
  if (name.includes("muesli") || name.includes("cereal")) return pick(1900);
  if (name.includes("spaghetti") || name.includes("penne") || name.includes("pasta")) return pick(1800);
  if (name.includes("olive oil")) return pick(4100);
  if (name.includes("coffee")) return pick(5);
  if (name.includes("cheddar")) return pick(800);
  if (name.includes("feta")) return pick(530);
  if (name.includes("gouda")) return pick(712);
  if (name.includes("parmesan")) return pick(860);
  if (name.includes("cheese")) return pick(700);
  if (name.includes("yogurt")) return pick(150);
  if (name.includes("bread")) return pick(1800);
  if (name.includes("banana")) return pick(135);
  if (name.includes("chicken breast")) return pick(600);
  if (name.includes("tomato sauce")) return pick(175);
  if (name.includes("tomato")) return pick(45);
  if (name.includes("spinach")) return pick(46);
  if (name.includes("cucumber")) return pick(50);
  if (name.includes("potato")) return pick(1540);
  if (name.includes("water")) return null;
  if (barcode.startsWith("receipt-generic:")) return pick(200);

  return null;
}

export default function StatsPage() {
  const { isAuthenticated } = useAuthGuard();
  const api = useApi();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { message } = App.useApp();

  const householdId = Number(params.id);

  const { value: token } = useSessionStorage<string>("token", "");
  const { value: cachedHouseholds, set: setHouseholds } = useSessionStorage<HouseholdWithRole[]>("households", []);
  const { clear: clearSelectedHouseholdId } = useSessionStorage<number | null>("selectedHouseholdId", null);
  const { value: userId } = useSessionStorage<string>("userId", "");

  const householdName = useMemo(
    () =>
      cachedHouseholds.find((h) => h.householdId === householdId)?.name ??
      `Household ${householdId}`,
    [cachedHouseholds, householdId],
  );

  const currentHousehold = useMemo(
    () => cachedHouseholds.find((h) => h.householdId === householdId) ?? null,
    [cachedHouseholds, householdId],
  );

  const householdRole = currentHousehold?.role ?? null;
  const isOwner = householdRole === "owner";

  const householdCreatedAt = useMemo(() => {
    if (!currentHousehold?.createdAt) return null;

    const created = dayjs(currentHousehold.createdAt);
    return created.isValid() ? created.startOf("day") : null;
  }, [currentHousehold]);

  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const initializedForHousehold = useRef<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [pantry, setPantry] = useState<PantryOverview | null>(null);
  const [stats, setStats] = useState<HouseholdStats | null>(null);
  const [budgetRecord, setBudgetRecord] = useState<HouseholdBudget | null>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetForm] = Form.useForm<{ dailyCalorieTarget: number }>();

  const [personalGoal, setPersonalGoal] = useState<HealthGoal | null>(null);
  const [consumingItemId, setConsumingItemId] = useState<number | null>(null);
  const [removingItemId, setRemovingItemId] = useState<number | null>(null);
  const [unknownConsumeState, setUnknownConsumeState] = useState<UnknownConsumeState | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [hasValidHouseholdRoute, setHasValidHouseholdRoute] = useState(false);

  const pantryKnownCalories = useMemo(() => {
    return (pantry?.items ?? []).reduce((sum, item) => {
      const kcal = item.kcalPerPackage;
      const count = item.count;
      if (!isKnownCalories(kcal) || !Number.isFinite(count) || count <= 0) {
        return sum;
      }
      return sum + kcal * count;
    }, 0);
  }, [pantry?.items]);

  const pantryUnknownCaloriesCount = useMemo(() => {
    return (pantry?.items ?? []).filter((item) => !isKnownCalories(item.kcalPerPackage)).length;
  }, [pantry?.items]);

  const loadDashboard = useCallback(async () => {
    if (!hasValidHouseholdRoute || !householdId || !startDate) {
      return;
    }

    const endStr = dayjs().format("YYYY-MM-DD");
    const startStr = startDate.format("YYYY-MM-DD");

    setLoading(true);
    try {
      const [pantryRes, statsRes, logsRes] = await Promise.all([
        api.get<PantryOverview>(`/households/${householdId}/pantry`),
        api.get<HouseholdStats>(
          `/households/${householdId}/stats?startDate=${startStr}&endDate=${endStr}`,
        ),
        api.get<ConsumptionLogEntry[]>(
          `/households/${householdId}/consumption-logs?limit=30`,
        ),
      ]);
      setPantry(pantryRes);
      setStats(statsRes);
      setActivity(buildRecentActivity(pantryRes.items, logsRes));

      await Promise.all([
        api.get<HouseholdBudget>(`/households/${householdId}/budget`)
          .then(setBudgetRecord)
          .catch((error) => { if (isNotFound(error)) setBudgetRecord(null); else throw error; }),
        userId
          ? api.get<HealthGoal>(`/users/${userId}/health-goal`)
              .then(setPersonalGoal)
              .catch((error) => {
            if (isNotFound(error)) setPersonalGoal(null);
            else message.warning(error instanceof Error ? error.message : "Failed to load health goal.");
          })
          : Promise.resolve(),
      ]);
    } catch (error) {
      setPantry(null);
      setStats(null);
      setBudgetRecord(null);
      setActivity([]);
      message.error(error instanceof Error ? error.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [api, message, householdId, startDate, hasValidHouseholdRoute, userId]);

  useEffect(() => {
    let cancelled = false;

    const rejectInvalidHouseholdRoute = (text: string) => {
      if (cancelled) return;
      setHasValidHouseholdRoute(false);
      message.error(text);
      routeBackToSafeHouseholdsPage(router);
    };

    const validateHouseholdRoute = async () => {
      setHasValidHouseholdRoute(false);

      if (!Number.isInteger(householdId) || householdId <= 0) {
        rejectInvalidHouseholdRoute("Household ID is invalid.");
        return;
      }

      try {
        const household = await api.get<HouseholdLookup>(`/households/${householdId}`);
        if (cancelled) return;

        const requestedName = searchParams.get("name")?.trim();
        if (requestedName && requestedName !== household.name) {
          rejectInvalidHouseholdRoute("Household name does not exist for this household.");
          return;
        }

        setHasValidHouseholdRoute(true);
      } catch (error) {
        const notMember = error instanceof Error && error.message.includes("User is not a member");
        if (notMember) {
          setHouseholds(cachedHouseholds.filter((h) => h.householdId !== householdId));
          clearSelectedHouseholdId();
        }
        rejectInvalidHouseholdRoute(notMember ? "You are not a member of this household." : "Household ID does not exist.");
      }
    };

    void validateHouseholdRoute();

    return () => {
      cancelled = true;
    };
  }, [api, householdId, message, router, searchParams]);

  useEffect(() => {
    if (!hasValidHouseholdRoute || !householdId || !cachedHouseholds.length) return;
    if (initializedForHousehold.current === householdId) return;
    initializedForHousehold.current = householdId;

    const sevenDaysAgo = dayjs().subtract(7, "day").startOf("day");
    setStartDate(
      householdCreatedAt && householdCreatedAt.isAfter(sevenDaysAgo)
        ? householdCreatedAt
        : sevenDaysAgo,
    );
  }, [householdId, cachedHouseholds, hasValidHouseholdRoute, householdCreatedAt]);

  const disableConsumptionStartDate = useCallback(
    (current: Dayjs) => {
      const selected = current.startOf("day");
      const today = dayjs().startOf("day");

      return (householdCreatedAt !== null && selected.isBefore(householdCreatedAt)) || selected.isAfter(today);
    },
    [householdCreatedAt],
  );

  const setConsumptionStartDate = useCallback(
    (value: Dayjs | null) => {
      if (!value) return;

      const today = dayjs().startOf("day");
      let next = value.startOf("day");

      if (next.isAfter(today)) {
        next = today;
      }

      if (householdCreatedAt !== null && next.isBefore(householdCreatedAt)) {
        next = householdCreatedAt;
      }

      setStartDate(next);
    },
    [householdCreatedAt],
  );

  useEffect(() => {
    if (isAuthenticated && hasValidHouseholdRoute && householdId && startDate) {
      void loadDashboard();
    }
  }, [isAuthenticated, loadDashboard, householdId, startDate, hasValidHouseholdRoute]);

  usePantryWebSocket({
    householdId: hasValidHouseholdRoute && Number.isFinite(householdId) && householdId > 0 ? householdId : null,
    token,
    onMessage: (msg) => {
      if (msg.eventType === "HOUSEHOLD_DELETED") {
        setHouseholds(cachedHouseholds.filter((h) => h.householdId !== householdId));
        clearSelectedHouseholdId();
        message.warning("This household has been deleted.");
        router.push("/households");
        return;
      }
      if (msg.eventType === "MEMBER_REMOVED" && msg.removedUserId === Number(userId)) {
        setHouseholds(cachedHouseholds.filter((h) => h.householdId !== householdId));
        clearSelectedHouseholdId();
        message.warning("You have been removed from this household.");
        router.push("/households");
        return;
      }
      void loadDashboard();
    },
  });

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
    const values = await budgetForm.validateFields();
    setSavingBudget(true);
    try {
      const updated = await api.put<HouseholdBudget>(`/households/${householdId}/budget`, {
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

  const executeConsume = useCallback(
    async (item: PantryItem, options?: { kcalPerPackage?: number | null; skipCalorieLogging?: boolean }) => {
      setConsumingItemId(item.id);
      try {
        const res = await api.post<ConsumePantryItemResponse>(
          `/households/${householdId}/pantry/${item.id}/consume`,
          {
            quantity: 1,
            kcalPerPackage: options?.kcalPerPackage ?? null,
            skipCalorieLogging: options?.skipCalorieLogging ?? false,
          },
        );
        message.success(
          res.removed
            ? "Item fully consumed and removed from pantry."
            : "Consumption recorded.",
        );
        setUnknownConsumeState(null);
        await loadDashboard();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "Could not record consumption.");
      } finally {
        setConsumingItemId(null);
      }
    },
    [api, householdId, loadDashboard, message],
  );

  const consumeInventoryItem = useCallback(
    async (item: PantryItem) => {
      if (!item.id) {
        message.error("Selected item is missing an item ID.");
        return;
      }
      if (!item.count || item.count <= 0) {
        message.error("This item is no longer available in the pantry.");
        return;
      }

      if (!isKnownCalories(item.kcalPerPackage)) {
        setUnknownConsumeState({
          item,
          suggestedCalories: estimateSuggestedCalories(item),
          mode: estimateSuggestedCalories(item) !== null ? "suggested" : "manual",
          manualCalories: estimateSuggestedCalories(item),
        });
        return;
      }

      await executeConsume(item);
    },
    [executeConsume, message],
  );


  const removeInventoryItem = useCallback(
    async (item: PantryItem) => {
      if (!item.id) {
        message.error("Selected item is missing an item ID.");
        return;
      }
      if (!item.count || item.count <= 0) {
        message.error("This item is no longer available in the pantry.");
        return;
      }

      setRemovingItemId(item.id);
      try {
        const res = await api.post<ConsumePantryItemResponse>(
          `/households/${householdId}/pantry/${item.id}/remove`,
          { quantity: 1 },
        );
        message.success(
          res.removed
            ? "Item removed from pantry."
            : "One unit removed from pantry.",
        );
        await loadDashboard();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "Could not remove item from pantry.");
      } finally {
        setRemovingItemId(null);
      }
    },
    [api, householdId, loadDashboard, message],
  );

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
        render: (_: unknown, record: PantryItem) => {
          const totalCalories =
            isKnownCalories(record.kcalPerPackage) && Number.isFinite(record.count) && record.count > 0
              ? record.kcalPerPackage * record.count
              : null;
          return <Text strong>{formatKcalDisplay(totalCalories)}</Text>;
        },
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
      {
        title: "Action",
        key: "action",
        width: 220,
        render: (_: unknown, record: PantryItem) => (
          <Space size="small" wrap>
            <Button
              type="primary"
              size="small"
              icon={<RestOutlined />}
              loading={consumingItemId === record.id}
              disabled={Boolean(consumingItemId) || Boolean(removingItemId) || record.count <= 0}
              onClick={() => void consumeInventoryItem(record)}
            >
              Consume
            </Button>
            <Button
              size="small"
              danger
              loading={removingItemId === record.id}
              disabled={Boolean(consumingItemId) || Boolean(removingItemId) || record.count <= 0}
              onClick={() => void removeInventoryItem(record)}
            >
              Remove
            </Button>
          </Space>
        ),
      },
    ],
    [consumeInventoryItem, consumingItemId, removeInventoryItem, removingItemId],
  );

  if (!hasValidHouseholdRoute) {
    return null;
  }

  return (
    <VirtualPantryAppShell activeNav="pantry">
      <div className={statsStyles.pageHeader}>
        <Space style={{ marginBottom: 12 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/households/${householdId}`)}
          >
            Back to pantry
          </Button>
        </Space>
        <Title level={2} className={statsStyles.pageTitle}>
          {householdName} — Overview
        </Title>
        <Paragraph className={statsStyles.pageSubtitle}>
          Energy reservoir, consumption flow, and budget control — with current inventory and a record of
          what you use from the pantry.
        </Paragraph>
      </div>

      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        {loading && !stats ? (
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
                      {pantry ? formatKcalDisplay(pantryKnownCalories) : "—"}
                    </Title>
                    <Text className={statsStyles.metricFootnote}>
                      {pantry
                        ? `${pantry.items.length} item(s) currently in your digital atelier.`
                        : ""}
                    </Text>
                    {pantryUnknownCaloriesCount > 0 ? (
                      <Text className={statsStyles.metricFootnote}>
                        {pantryUnknownCaloriesCount} item{pantryUnknownCaloriesCount === 1 ? "" : "s"} excluded from the
                        total because calorie data is unknown.
                      </Text>
                    ) : null}
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
                      onChange={setConsumptionStartDate}
                      disabledDate={disableConsumptionStartDate}
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
                      <Text style={{ color: MUTED }}>Your recommendation</Text>
                      <div>
                        {personalGoal ? (
                          <Text strong style={{ fontSize: 16, color: FOREST }}>
                            {Math.round(personalGoal.recommendedDailyCalories).toLocaleString()} kcal
                          </Text>
                        ) : (
                          <Text style={{ color: MUTED }}>
                            Not set ·{" "}
                            {userId && (
                              <Button
                                type="link"
                                onClick={() => router.push(`/users/${userId}/health-goal`)}
                                style={{ color: FOREST, padding: 0, height: "auto" }}
                              >
                                Set goal →
                              </Button>
                            )}
                          </Text>
                        )}
                      </div>
                    </div>
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
                            {stats.comparisonToBudget.status.split("_").join(" ")}
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
              <Col xs={24}>
                <Space orientation="vertical" size="large" style={{ width: "100%" }}>
                  <Card
                    className={statsStyles.panelCard}
                    title="Current inventory"
                    extra={
                      <Space size="small" wrap>
                        <Button
                          type="primary"
                          size="small"
                          onClick={() =>
                            router.push(
                              `/pantry/add/scan?householdId=${householdId}&householdName=${encodeURIComponent(householdName)}`,
                            )
                          }
                        >
                          Scan product barcode
                        </Button>
                        <Button
                          type="primary"
                          size="small"
                          onClick={() =>
                            router.push(
                              `/open-food-facts?householdId=${householdId}&householdName=${encodeURIComponent(householdName)}`,
                            )
                          }
                        >
                          Add from Open Food Facts
                        </Button>
                      </Space>
                    }
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
                      />
                    )}
                  </Card>

                  <Card className={`${statsStyles.panelCard} ${statsStyles.activityCard}`} title="Recent activity" variant="borderless">
                    {activity.length === 0 ? (
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        No pantry activity recorded yet, or logs are still loading.
                      </Text>
                    ) : (
                      <div className={statsStyles.activityList}>
                        {activity.map((a) => {
                          const isAdded = a.type === "ADDED";
                          return (
                            <div key={a.id} className={statsStyles.activityItem}>
                              <div>
                                <Space size={8}>
                                  {isAdded ? (
                                    <PlusCircleOutlined style={{ color: FOREST }} />
                                  ) : (
                                    <MinusCircleOutlined style={{ color: DANGER }} />
                                  )}
                                  <Text strong style={{ color: "#1b2a1b" }}>
                                    {isAdded ? "Added" : "Consumed"} {a.quantity}× {a.productName}
                                  </Text>
                                </Space>
                                <div className={statsStyles.activityMeta}>
                                  {dayjs(a.at).format("MMM D, YYYY · HH:mm")}
                                </div>
                              </div>
                              <span className={`${statsStyles.activityDelta} ${isAdded ? statsStyles.deltaPos : statsStyles.deltaNeg}`}>
                                {isKnownCalories(a.deltaKcal)
                                  ? `${isAdded ? "+" : ""}${Math.round(a.deltaKcal).toLocaleString()} kcal`
                                  : "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </Space>
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
        title="Missing calorie data"
        open={Boolean(unknownConsumeState)}
        onCancel={() => setUnknownConsumeState(null)}
        onOk={() => {
          if (!unknownConsumeState) return;

          if (unknownConsumeState.mode === "suggested") {
            void executeConsume(unknownConsumeState.item, {
              kcalPerPackage: unknownConsumeState.suggestedCalories,
            });
            return;
          }

          if (unknownConsumeState.mode === "manual") {
            const manualCalories = unknownConsumeState.manualCalories;
            if (!isKnownCalories(manualCalories)) {
              message.error("Please enter a calorie value greater than 0.");
              return;
            }
            void executeConsume(unknownConsumeState.item, {
              kcalPerPackage: manualCalories,
            });
            return;
          }

          void executeConsume(unknownConsumeState.item, {
            skipCalorieLogging: true,
          });
        }}
        confirmLoading={unknownConsumeState ? consumingItemId === unknownConsumeState.item.id : false}
        okText={
          unknownConsumeState?.mode === "skip"
            ? "Consume without calories"
            : "Save and consume"
        }
      >
        <Paragraph type="secondary">
          This item has no calorie data yet. Please confirm or enter calories before logging consumption.
        </Paragraph>
        {unknownConsumeState ? (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Text strong style={{ color: "#1b2a1b" }}>
              {unknownConsumeState.item.name}
            </Text>
            <Radio.Group
              value={unknownConsumeState.mode}
              onChange={(event) =>
                setUnknownConsumeState((current) =>
                  current
                    ? { ...current, mode: event.target.value as UnknownConsumeMode }
                    : current,
                )
              }
            >
              <Space direction="vertical" size="middle">
                <Radio value="suggested" disabled={!isKnownCalories(unknownConsumeState.suggestedCalories)}>
                  Use system suggestion
                  {isKnownCalories(unknownConsumeState.suggestedCalories)
                    ? ` (${Math.round(unknownConsumeState.suggestedCalories).toLocaleString()} kcal / package)`
                    : " (not available)"}
                </Radio>
                <Radio value="manual">Enter calories manually</Radio>
                <Radio value="skip">Skip calorie logging for this consumption</Radio>
              </Space>
            </Radio.Group>
            {unknownConsumeState.mode === "manual" ? (
              <InputNumber
                min={1}
                value={unknownConsumeState.manualCalories ?? undefined}
                onChange={(value) =>
                  setUnknownConsumeState((current) =>
                    current
                      ? {
                          ...current,
                          manualCalories:
                            typeof value === "number" && Number.isFinite(value) ? value : null,
                        }
                      : current,
                  )
                }
                style={{ width: "100%" }}
                suffix="kcal / package"
              />
            ) : null}
            {unknownConsumeState.mode === "skip" ? (
              <Text type="secondary">
                The quantity will be consumed, but this event will not contribute to calorie totals.
              </Text>
            ) : null}
          </Space>
        ) : null}
      </Modal>

      <Modal
        title="Daily calorie budget"
        open={budgetModalOpen}
        onCancel={() => setBudgetModalOpen(false)}
        onOk={() => void submitBudget()}
        confirmLoading={savingBudget}
        okText="Save"
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
                max: 50000,
                message: "Enter a value up to 50000",
              },
              {
                validator: (_, value: number | null | undefined) => {
                  if (value === null || value === undefined) {
                    return Promise.resolve();
                  }

                  if (value <= 0) {
                    return Promise.reject(
                      new Error("Daily calorie target can't be less than or equal to 0"),
                    );
                  }

                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber max={50000} style={{ width: "100%" }} suffix="kcal / day" />
          </Form.Item>
        </Form>
      </Modal>

    </VirtualPantryAppShell>
  );
}
