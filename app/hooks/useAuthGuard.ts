"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { App } from "antd";

export function useAuthGuard(): { isAuthenticated: boolean } {
  const router = useRouter();
  const { message } = App.useApp();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let token: string | null = null;
    if (typeof window !== "undefined") {
      try {
        token = JSON.parse(sessionStorage.getItem("token") ?? "null") as string | null;
      } catch {
        token = null;
      }
    }

    if (!token) {
      void message.warning("Please log in to continue.", 2);
      router.replace("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [router, message]);

  return { isAuthenticated };
}
