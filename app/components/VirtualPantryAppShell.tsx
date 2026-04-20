"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { App, Avatar, ConfigProvider, theme as antdTheme } from "antd";
import {
  DashboardOutlined,
  HomeOutlined,
  InboxOutlined,
  LogoutOutlined,
  ReadOutlined,
} from "@ant-design/icons";
import useLocalStorage from "@/hooks/useLocalStorage";
import useSessionStorage from "@/hooks/useSessionStorage";
import type { HouseholdWithRole } from "@/types/household";
import styles from "@/styles/households.module.css";

export type VirtualPantryNav = "dashboard" | "households" | "pantry" | "recipes";

interface VirtualPantryAppShellProps {
  activeNav: VirtualPantryNav;
  children: React.ReactNode;
}

export function VirtualPantryAppShell({ activeNav, children }: VirtualPantryAppShellProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const { clear: clearToken } = useSessionStorage<string>("token", "");
  const { clear: clearUsername } = useSessionStorage<string>("username", "");
  const { value: households } = useLocalStorage<HouseholdWithRole[]>("households", []);
  const { value: selectedHouseholdId, set: setSelectedHouseholdId } = useLocalStorage<
    number | null
  >("selectedHouseholdId", null);
  const { value: username } = useSessionStorage<string>("username", "");

  const handleSidebarPantry = () => {
    if (households.length === 0) {
      message.info("Create or join a household first, then open Pantry.");
      return;
    }
    const id =
      selectedHouseholdId !== null &&
      households.some((h) => h.householdId === selectedHouseholdId)
        ? selectedHouseholdId
        : households[0].householdId;
    setSelectedHouseholdId(id);
    router.push("/stats");
  };

  const handleLogout = () => {
    clearToken();
    clearUsername();
    router.push("/login");
  };

  const userLabel = username?.trim() ? username.trim() : "@unknown";
  const userInitial = userLabel.charAt(0).toUpperCase();

  const navBtn = (nav: VirtualPantryNav) =>
    `${styles.menuItem} ${activeNav === nav ? styles.menuItemActive : ""}`;

  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#1f7a3f",
          colorText: "#182418",
          colorTextSecondary: "#566556",
          colorBgBase: "#f7f8ef",
          colorBgContainer: "#ffffff",
          colorBorder: "#dce4d0",
          borderRadius: 10,
        },
        components: {
          Input: {
            colorBgContainer: "#ffffff",
            colorText: "#1d2a1d",
            colorBorder: "#d8dfca",
          },
        },
      }}
    >
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div>
            <div className={styles.brand}>Virtual Pantry</div>
            <div className={styles.brandTagline}>The Organic Atelier</div>
          </div>
          <nav className={styles.menu}>
            <button
              type="button"
              className={navBtn("dashboard")}
              onClick={() => router.push("/users")}
            >
              <DashboardOutlined className={styles.menuIcon} />
              <span className={styles.menuText}>Dashboard</span>
            </button>
            <button type="button" className={navBtn("households")} onClick={() => router.push("/households")}>
              <HomeOutlined className={styles.menuIcon} />
              <span className={styles.menuText}>Households</span>
            </button>
            <button type="button" className={navBtn("pantry")} onClick={handleSidebarPantry}>
              <InboxOutlined className={styles.menuIcon} />
              <span className={styles.menuText}>Pantry</span>
            </button>
            <button
              type="button"
              className={navBtn("recipes")}
              onClick={() => message.info("Recipes are coming soon.")}
            >
              <ReadOutlined className={styles.menuIcon} />
              <span className={styles.menuText}>Recipes</span>
            </button>
          </nav>

          <div className={styles.sidebarFooter}>
            <button type="button" className={styles.logoutButton} onClick={handleLogout}>
              <LogoutOutlined className={styles.menuIcon} />
              <span className={styles.menuText}>Logout</span>
            </button>
          </div>
        </aside>

        <main className={styles.main}>
          <div className={styles.topUserBar}>
            <span className={styles.userName}>{userLabel}</span>
            <Avatar size={64} className={styles.userAvatar}>
              {userInitial}
            </Avatar>
          </div>
          {children}
        </main>
      </div>
    </ConfigProvider>
  );
}
