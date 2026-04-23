"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useSessionStorage from "@/hooks/useSessionStorage";
import type { HouseholdWithRole } from "@/types/household";
import { VirtualPantryAppShell } from "@/components/VirtualPantryAppShell";
import { Button, Col, Row, Tag, Typography } from "antd";
import styles from "@/styles/households.module.css";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const { Title, Paragraph } = Typography;

interface HouseholdMember {
  userId: number;
  username: string;
  role: "owner" | "member";
  joinedAt: string;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export default function HouseholdMembersPage() {
  const { isAuthenticated } = useAuthGuard();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const api = useApi();

  const { value: cachedHouseholds } = useSessionStorage<HouseholdWithRole[]>("households", []);
  const householdId = Number(params.id);

  const householdName = useMemo(() => {
    const queryName = searchParams.get("name");
    if (queryName?.trim()) return queryName.trim();
    return cachedHouseholds.find((h) => h.householdId === householdId)?.name ?? `Household ${householdId}`;
  }, [searchParams, cachedHouseholds, householdId]);

  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!Number.isFinite(householdId) || householdId <= 0) {
      setErrorMessage("Invalid household ID.");
      setIsLoading(false);
      return;
    }

    const fetchMembers = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await api.get<HouseholdMember[]>(`/households/${householdId}/members`);
        setMembers(data);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load members.");
      } finally {
        setIsLoading(false);
      }
    };
    void fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, isAuthenticated]);

  return (
    <VirtualPantryAppShell activeNav="households">
      <div className={styles.header}>
        <div>
          <Title level={1} className={styles.title}>{householdName}</Title>
          <Paragraph className={styles.subtitle}>Members of this household</Paragraph>
        </div>
        <Button onClick={() => router.push("/households")}>Back to households</Button>
      </div>

      <section className={styles.section}>
        <Title level={3} className={styles.sectionTitle}>
          Members ({isLoading ? "…" : members.length})
        </Title>

        {errorMessage && (
          <div className={styles.joinInfoBox} style={{ borderColor: "#f5c6cb", background: "#fff5f5", color: "#c0392b" }}>
            {errorMessage}
          </div>
        )}

        {!isLoading && members.length === 0 && !errorMessage && (
          <Paragraph type="secondary">No members found.</Paragraph>
        )}

        <Row gutter={[12, 12]}>
          {members.map((member) => (
            <Col xs={24} sm={12} md={8} lg={6} key={member.userId}>
              <div className={styles.householdCard} style={{ padding: 12, minHeight: "auto" }}>
                <Tag
                  color={member.role === "owner" ? "green" : "blue"}
                  style={{ marginBottom: 6 }}
                >
                  {member.role.toUpperCase()}
                </Tag>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{member.username}</div>
                <p className={styles.householdMeta} style={{ marginBottom: 0, marginTop: 4 }}>
                  Joined: {formatDate(member.joinedAt)}
                </p>
              </div>
            </Col>
          ))}
        </Row>
      </section>
    </VirtualPantryAppShell>
  );
}
