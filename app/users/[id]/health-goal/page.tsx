"use client";

import React, { useEffect, useState } from "react";
import {
  App,
  Button,
  Card,
  Form,
  InputNumber,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useSessionStorage from "@/hooks/useSessionStorage";
import { VirtualPantryAppShell } from "@/components/VirtualPantryAppShell";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import type { HealthGoal, HealthGoalPutRequest } from "@/types/healthGoal";

const { Title, Text } = Typography;
const { Option } = Select;

const FOREST = "#1b5e20";

interface FormValues {
  age: number;
  sex: string;
  height: number;
  weight: number;
  activityLevel: string;
  goalType: string;
  targetRate?: number;
}

export default function HealthGoalPage() {
  useAuthGuard();
  const api = useApi();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();

  const { value: storedUserId } = useSessionStorage<string>("userId", "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recommendation, setRecommendation] = useState<number | null>(null);
  const [goalType, setGoalType] = useState<string>("MAINTAIN");

  const urlId = params.id;

  useEffect(() => {
    if (storedUserId && storedUserId !== urlId) {
      router.replace("/login");
    }
  }, [storedUserId, urlId, router]);

  useEffect(() => {
    const load = async () => {
      try {
        const goal = await api.get<HealthGoal>(`/users/${urlId}/health-goal`);
        form.setFieldsValue({
          age: goal.age,
          sex: goal.sex,
          height: goal.height,
          weight: goal.weight,
          activityLevel: goal.activityLevel,
          goalType: goal.goalType,
          targetRate: goal.targetRate ?? undefined,
        });
        setGoalType(goal.goalType);
        setRecommendation(goal.recommendedDailyCalories);
      } catch {
        // 404 — no goal yet, leave form empty
      } finally {
        setLoading(false);
      }
    };
    if (urlId) void load();
  }, [api, urlId, form]);

  const handleSave = async (values: FormValues) => {
    setSaving(true);
    try {
      const body: HealthGoalPutRequest = {
        goalType: values.goalType as HealthGoalPutRequest["goalType"],
        age: values.age,
        sex: values.sex as HealthGoalPutRequest["sex"],
        height: values.height,
        weight: values.weight,
        activityLevel: values.activityLevel as HealthGoalPutRequest["activityLevel"],
        targetRate: values.goalType === "LOSE_WEIGHT" ? values.targetRate : null,
      };
      const saved = await api.put<HealthGoal>(`/users/${urlId}/health-goal`, body);
      setRecommendation(saved.recommendedDailyCalories);
      message.success("Health goal saved.");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Could not save health goal.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <VirtualPantryAppShell activeNav="dashboard">
        <Spin size="large" style={{ display: "block", marginTop: 80 }} />
      </VirtualPantryAppShell>
    );
  }

  return (
    <VirtualPantryAppShell activeNav="dashboard">
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
          Back
        </Button>
      </Space>
      <Title level={2} style={{ color: "#182418" }}>
        Health Goal
      </Title>

      <Card variant="borderless" style={{ maxWidth: 520 }}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Form.Item
              name="age"
              label="Age"
              rules={[{ required: true, message: "Required" }]}
            >
              <InputNumber min={10} max={120} style={{ width: "100%" }} suffix="yrs" />
            </Form.Item>
            <Form.Item
              name="sex"
              label="Sex"
              rules={[{ required: true, message: "Required" }]}
            >
              <Select placeholder="Select">
                <Option value="FEMALE">Female</Option>
                <Option value="MALE">Male</Option>
                <Option value="OTHER">Other</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="height"
              label="Height (cm)"
              rules={[{ required: true, message: "Required" }]}
            >
              <InputNumber min={50} max={300} style={{ width: "100%" }} suffix="cm" />
            </Form.Item>
            <Form.Item
              name="weight"
              label="Weight (kg)"
              rules={[{ required: true, message: "Required" }]}
            >
              <InputNumber min={20} max={500} style={{ width: "100%" }} suffix="kg" />
            </Form.Item>
          </div>

          <Form.Item
            name="activityLevel"
            label="Activity Level"
            rules={[{ required: true, message: "Required" }]}
          >
            <Select placeholder="Select activity level">
              <Option value="SEDENTARY">Sedentary (little or no exercise)</Option>
              <Option value="LIGHT">Lightly active (1–3 days/week)</Option>
              <Option value="MODERATE">Moderately active (3–5 days/week)</Option>
              <Option value="ACTIVE">Active (6–7 days/week)</Option>
              <Option value="VERY_ACTIVE">Very active (hard exercise daily)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="goalType"
            label="Goal"
            rules={[{ required: true, message: "Required" }]}
          >
            <Select placeholder="Select goal" onChange={(v: string) => setGoalType(v)}>
              <Option value="LOSE_WEIGHT">Lose weight</Option>
              <Option value="MAINTAIN">Maintain weight</Option>
              <Option value="GAIN_MUSCLE">Gain muscle</Option>
            </Select>
          </Form.Item>

          {goalType === "LOSE_WEIGHT" && (
            <Form.Item
              name="targetRate"
              label="Target rate (kg/week)"
              rules={[{ required: true, message: "Required" }]}
            >
              <InputNumber min={0.1} max={1.0} step={0.1} style={{ width: "100%" }} suffix="kg/week" />
            </Form.Item>
          )}

          {recommendation !== null && (
            <div
              style={{
                background: "#e8f5e9",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              <Text style={{ color: FOREST, display: "block", marginBottom: 4 }}>
                Recommended daily calories
              </Text>
              <Text strong style={{ fontSize: 28, color: "#1b5e20" }}>
                {Math.round(recommendation).toLocaleString()} kcal
              </Text>
            </div>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} style={{ width: "100%" }}>
              Save Health Goal
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </VirtualPantryAppShell>
  );
}
