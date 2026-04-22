"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useAuthGuard() {
  const router = useRouter();

  useEffect(() => {
    let token: string | null = null;
    try {
      token = JSON.parse(sessionStorage.getItem("token") ?? "null") as string | null;
    } catch {
      token = null;
    }

    if (!token) {
      router.replace("/login");
    }
  }, [router]);
}
