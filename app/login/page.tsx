"use client";

import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import AuthLayout from "@/components/auth/AuthLayout";
import { getLoginErrorMessage } from "@/utils/authError";
import { User } from "@/types/user";
import { Button, Checkbox, Form, Input } from "antd";
import styles from "@/styles/auth.module.css";

interface LoginFormValues {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm<LoginFormValues>();
  const { set: setToken } = useLocalStorage<string>("token", "");

  const handleLogin = async (values: LoginFormValues): Promise<void> => {
    try {
      const response = await apiService.post<User>("/users/login", {
        username: values.username.trim(),
        password: values.password,
      });

      if (response.token) {
        setToken(response.token);
      }

      router.push("/users");
    } catch (error) {
      alert(getLoginErrorMessage(error));
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
