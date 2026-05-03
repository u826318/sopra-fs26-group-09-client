"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Alert, Button, Card, DatePicker, Space, Spin, Typography, App } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

import { VirtualPantryAppShell } from "@/components/VirtualPantryAppShell";
import statsStyles from "@/styles/stats.module.css";

import { useApi } from "@/hooks/useApi";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const { Title, Text, Paragraph } = Typography;

interface UserPersonalProfileGetDTO {
  id: number;
  userId: number;
  birthDate: string;
}

interface UserPersonalProfileUpdateDTO {
  birthDate: string;
}

function calculateAgeYears(birthDate: Dayjs | null): number | null {
  if (!birthDate) {
    return null;
  }

  const today = dayjs();
  let ageYears = today.year() - birthDate.year();
  const birthdayThisYear = birthDate.year(today.year());

  if (today.isBefore(birthdayThisYear, "day")) {
    ageYears -= 1;
  }

  return ageYears;
}

const UserPersonalProfileDetailPage: React.FC = () => {
  const { isAuthenticated } = useAuthGuard();
  const params = useParams<{ id: string }>();
  const api = useApi();
  const { message } = App.useApp();

  const userId = params.id;

  const [birthDate, setBirthDate] = useState<Dayjs | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ageYears = useMemo(() => calculateAgeYears(birthDate), [birthDate]);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      return;
    }

    let cancelled = false;

    const loadPersonalProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const profile = await api.get<UserPersonalProfileGetDTO>(
          `/users/${userId}/personal-profile`,
        );

        if (cancelled) {
          return;
        }

        setBirthDate(profile.birthDate ? dayjs(profile.birthDate) : null);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        const status = (loadError as { status?: number })?.status;

        if (status === 404) {
          setBirthDate(null);
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load personal profile.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPersonalProfile();

    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated, userId]);

  const handleSaveBirthDate = async () => {
    if (!birthDate) {
      message.error("Please select a birth date.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: UserPersonalProfileUpdateDTO = {
        birthDate: birthDate.format("YYYY-MM-DD"),
      };

      const updatedProfile = await api.put<UserPersonalProfileGetDTO>(
        `/users/${userId}/personal-profile`,
        payload,
      );

      setBirthDate(updatedProfile.birthDate ? dayjs(updatedProfile.birthDate) : null);
      message.success("Birth date saved.");
    } catch (saveError) {
      const errorMessage =
        saveError instanceof Error
          ? saveError.message
          : "Could not save birth date.";

      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const disableInvalidBirthDates = (currentDate: Dayjs) => {
    const latestAllowedBirthDate = dayjs().subtract(1, "year");
    return currentDate.isAfter(latestAllowedBirthDate, "day");
  };

    return (
    <VirtualPantryAppShell activeNav="dashboard">
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div className={statsStyles.pageHeader}>
            <Title level={2} className={statsStyles.pageTitle}>
            User Personal Profile
            </Title>
            <Paragraph className={statsStyles.pageSubtitle}>
            Testing page for setting and updating the user&apos;s birth date.
            </Paragraph>
        </div>

        <Card
            className={statsStyles.panelCard}
            title="Birth date"
            variant="borderless"
        >
            {loading ? (
            <Spin />
            ) : (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {error && <Alert type="error" message={error} showIcon />}

                <div>
                <Text strong>Birth date</Text>
                <DatePicker
                    value={birthDate}
                    onChange={setBirthDate}
                    format="YYYY-MM-DD"
                    disabledDate={disableInvalidBirthDates}
                    allowClear={false}
                    style={{ display: "block", marginTop: 8, width: "100%" }}
                />
                </div>

                <div>
                <Text strong>Age</Text>
                <div style={{ marginTop: 4 }}>
                    <Text>
                    {ageYears === null ? "No birth date selected" : `${ageYears}y`}
                    </Text>
                </div>
                </div>

                <Button
                type="primary"
                onClick={handleSaveBirthDate}
                loading={saving}
                disabled={!birthDate}
                >
                Save birth date
                </Button>
            </Space>
            )}
        </Card>
        </Space>
    </VirtualPantryAppShell>
    );
};

export default UserPersonalProfileDetailPage;
