"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useSessionStorage from "@/hooks/useSessionStorage";
import useLocalStorage from "@/hooks/useLocalStorage";
import AuthLayout from "@/components/auth/AuthLayout";
import { getLoginErrorMessage } from "@/utils/authError";
import { User } from "@/types/user";
import type { HouseholdWithRole } from "@/types/household";
import { App, Button, Checkbox, Form, Input } from "antd";
import styles from "@/styles/auth.module.css";

interface LoginFormValues {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const router = useRouter();
  const { message } = App.useApp();
  const apiService = useApi();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === "session_expired") {
      message.warning("Your session has expired. Please log in again. If login fails, your account may no longer exist, please register.");
      return;
    }
    try {
      const token = JSON.parse(sessionStorage.getItem("token") ?? "null") as string | null;
      if (token) router.replace("/households");
    } catch {
      // malformed token, stay on login
    }
  }, [message, router]);
  const [form] = Form.useForm<LoginFormValues>();
  const { set: setToken } = useSessionStorage<string>("token", "");
  const { set: setUsername } = useSessionStorage<string>("username", "");
  const { set: setHouseholds } = useLocalStorage<HouseholdWithRole[]>("households", []);

  const handleLogin = async (values: LoginFormValues): Promise<void> => {
    try {
      const response = await apiService.post<User>("/users/login", {
        username: values.username.trim(),
        password: values.password,
      });

      if (response.token) {
        setToken(response.token);
      }
      setUsername(response.username?.trim() || values.username.trim());

      try {
        const households = await apiService.get<HouseholdWithRole[]>("/households");
        setHouseholds(households);
      } catch {
        setHouseholds([]);
      }

      router.push("/households");
    } catch (error) {
      message.error(getLoginErrorMessage(error));
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to continue to your pantry."
      switchPrompt="Don't have an account?"
      switchActionLabel="Create account"
      onSwitchAction={() => router.push("/register")}
    >
      <Form<LoginFormValues>
        form={form}
        name="login"
        size="large"
        variant="outlined"
        onFinish={handleLogin}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="username"
          label="Username"
          rules={[{ required: true, message: "Please input your username." }]}
        >
          <Input placeholder="Your username" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: "Please input your password." }]}
        >
          <Input.Password placeholder="••••••••" />
        </Form.Item>
        <Form.Item name="rememberMe" valuePropName="checked">
          <Checkbox className={styles.inlineAgreement}>Remember me</Checkbox>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" className={styles.submitButton}>
            Sign In
          </Button>
        </Form.Item>
      </Form>
    </AuthLayout>
  );
};

export default Login;
