"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, Empty, Space, Typography } from "antd";
import { useApi } from "@/hooks/useApi";
import useSessionStorage from "@/hooks/useSessionStorage";
import type { User } from "@/types/user";
import type { ReceiptAnalysisResult } from "@/types/receipt";
import ReceiptAnalysisResultPanel from "@/components/receipts/ReceiptAnalysisResultPanel";

const { Paragraph, Title } = Typography;

const Profile: React.FC = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const api = useApi();
  const profileId = useMemo(() => Number(params?.id), [params]);
  const { value: sessionUserId } = useSessionStorage<number | null>("userId", null);

  const [profile, setProfile] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [history, setHistory] = useState<ReceiptAnalysisResult[]>([]);

  const isOwnProfile = sessionUserId !== null && sessionUserId === profileId;

  useEffect(() => {
    if (!Number.isFinite(profileId) || profileId <= 0) {
      setProfileLoading(false);
      return;
    }

    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const user = await api.get<User>(`/users/${profileId}`);
        setProfile(user);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to load user profile.");
      } finally {
        setProfileLoading(false);
      }
    };

    void loadProfile();
  }, [api, profileId]);

  const toggleHistory = async () => {
    const nextVisible = !historyVisible;
    setHistoryVisible(nextVisible);

    if (!nextVisible || history.length > 0 || !Number.isFinite(profileId) || profileId <= 0) {
      return;
    }

    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const results = await api.get<ReceiptAnalysisResult[]>(`/users/${profileId}/receipt-analyses`);
      setHistory(results);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Failed to load receipt analysis history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="card-container" style={{ padding: 24 }}>
      <Card loading={profileLoading} style={{ width: "100%", maxWidth: 1100 }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Space style={{ width: "100%", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              <Title level={2} style={{ marginBottom: 0 }}>
                User profile
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Inspect the selected user and, for your own account, open the receipt analysis history tied to that user.
              </Paragraph>
            </div>
            <Space wrap>
              <Button onClick={() => router.push("/users")}>Back to users</Button>
              <Button onClick={() => router.push("/open-food-facts")}>Debug portal</Button>
            </Space>
          </Space>

          {profile ? (
            <Card size="small" title="Basic user info">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <th scope="row" style={{ textAlign: "left", padding: "8px 12px 8px 0" }}>Id</th>
                    <td style={{ padding: "8px 0" }}>{profile.id ?? "—"}</td>
                  </tr>
                  <tr>
                    <th scope="row" style={{ textAlign: "left", padding: "8px 12px 8px 0" }}>Username</th>
                    <td style={{ padding: "8px 0" }}>{profile.username ?? "—"}</td>
                  </tr>
                  <tr>
                    <th scope="row" style={{ textAlign: "left", padding: "8px 12px 8px 0" }}>Name</th>
                    <td style={{ padding: "8px 0" }}>{profile.name ?? "—"}</td>
                  </tr>
                  <tr>
                    <th scope="row" style={{ textAlign: "left", padding: "8px 12px 8px 0" }}>Status</th>
                    <td style={{ padding: "8px 0" }}>{profile.status ?? "—"}</td>
                  </tr>
                </tbody>
              </table>
            </Card>
          ) : (
            <Empty description="User profile could not be loaded." />
          )}

          <Card
            size="small"
            title="Receipt analysis history"
            extra={
              <Button type="primary" onClick={() => void toggleHistory()} disabled={!isOwnProfile}>
                {historyVisible ? "Hide history" : "Show historical receipt analyses"}
              </Button>
            }
          >
            {!isOwnProfile ? (
              <Paragraph style={{ marginBottom: 0 }}>
                Receipt analysis history is only available on your own user page, because each analysis is tied to the requesting user account.
              </Paragraph>
            ) : historyVisible ? (
              historyLoading ? (
                <Paragraph style={{ marginBottom: 0 }}>Loading your saved receipt analyses...</Paragraph>
              ) : historyError ? (
                <Paragraph type="danger" style={{ marginBottom: 0 }}>{historyError}</Paragraph>
              ) : history.length > 0 ? (
                <Space direction="vertical" size="large" style={{ width: "100%" }}>
                  {history.map((result, index) => (
                    <ReceiptAnalysisResultPanel
                      key={result.id ?? index}
                      result={result}
                      showMetadata
                      cardTitle={`Receipt analysis ${index + 1}`}
                    />
                  ))}
                </Space>
              ) : (
                <Empty description="No saved receipt analyses yet." />
              )
            ) : (
              <Paragraph style={{ marginBottom: 0 }}>
                Use the button to load the receipt analyses tied to this user, ordered from newest request to oldest.
              </Paragraph>
            )}
          </Card>
        </Space>
      </Card>
    </div>
  );
};

export default Profile;
