"use client";

import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { ApplicationError } from "@/types/error";
import { User } from "@/types/user";
import { Button, Checkbox, Form, Input } from "antd";
import styles from "@/styles/auth.module.css";

interface RegisterFormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

const isApplicationError = (error: unknown): error is ApplicationError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number" &&
    "message" in error
  );
};

const Register: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm<RegisterFormValues>();
  const { set: setToken } = useLocalStorage<string>("token", "");

  const handleRegister = async (values: RegisterFormValues): Promise<void> => {
    try {
      const response = await apiService.post<User>("/users/register", {
        username: values.username.trim(),
        password: values.password,
      });

      if (response.token) {
        setToken(response.token);
      }

      router.push("/users");
    } catch (error) {
      if (isApplicationError(error)) {
        const message = error.message.toLowerCase();
        if (error.status === 400 && message.includes("username")) {
          alert("This username is already taken. Please choose another one.");
          return;
        }
        if (error.status >= 500) {
          alert("Server is currently unavailable. Please try again later.");
          return;
        }
        alert(`Registration failed:\n${error.message}`);
      } else if (error instanceof Error) {
        alert("Unable to connect. Please check your network and try again.");
      } else {
        alert("An unknown error occurred during registration.");
      }
    }
  };

  return (
    <>
      <div className={styles.authPage}>
        <section className={styles.leftPanel}>
          <p className={styles.brand}>Virtual Pantry</p>
          <h1 className={styles.heroTitle}>
            Manage Your <span className={styles.heroTitleAccent}>Pantry</span>{" "}
            Like Never Before
          </h1>
          <div className={styles.featureList}>
            <article className={styles.featureCard}>
              <p className={styles.featureTitle}>Household Collaboration</p>
              <p className={styles.featureText}>
                Share access with family members and sync your shopping list in
                real time.
              </p>
            </article>
            <article className={styles.featureCard}>
              <p className={styles.featureTitle}>Smart Notifications</p>
              <p className={styles.featureText}>
                Receive gentle nudges before ingredients expire to reduce waste.
              </p>
            </article>
            <article className={styles.featureCard}>
              <p className={styles.featureTitle}>Usage Analytics</p>
              <p className={styles.featureText}>
                Monitor trends and optimize your household grocery budget.
              </p>
            </article>
          </div>
          <p className={styles.leftFooter}>THE DIGITAL CONSERVATORY © 2024</p>
        </section>

        <section className={styles.rightPanel}>
          <div className={styles.authCard}>
            <h2 className={styles.authTitle}>Create Account</h2>
            <p className={styles.authSubtitle}>
              Join our community of mindful curators.
            </p>

            <Form<RegisterFormValues>
              form={form}
              name="register"
              size="large"
              variant="outlined"
              onFinish={handleRegister}
              layout="vertical"
              autoComplete="off"
            >
              <Form.Item
                name="username"
                label="Username"
                rules={[{ required: true, message: "Please input your username." }]}
              >
                <Input placeholder="Your name" />
              </Form.Item>
              <Form.Item
                name="email"
                label="Email Address"
                rules={[
                  { required: true, message: "Please input your email." },
                  { type: "email", message: "Please enter a valid email address." },
                ]}
              >
                <Input placeholder="your.email@example.com" />
              </Form.Item>
              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: "Please input your password." },
                  { min: 6, message: "Password must have at least 6 characters." },
                ]}
              >
                <Input.Password placeholder="••••••••" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="Confirm Password"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "Please confirm your password." },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("Passwords do not match."));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="••••••••" />
              </Form.Item>
              <Form.Item
                name="acceptedTerms"
                valuePropName="checked"
                rules={[
                  {
                    validator: (_, value) =>
                      value
                        ? Promise.resolve()
                        : Promise.reject(
                            new Error("Please agree to the terms to continue."),
                          ),
                  },
                ]}
              >
                <Checkbox className={styles.inlineAgreement}>
                  <span className={styles.requiredSign}>*</span>{" "}
                  I agree to the <a href="#terms">Terms of Service</a> and{" "}
                  <a href="#privacy">Privacy Policy</a>.
                </Checkbox>
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" className={styles.submitButton}>
                  Create Account
                </Button>
              </Form.Item>
            </Form>

            <p className={styles.switchRow}>
              Already have an account?{" "}
              <Button
                type="link"
                className={styles.switchLink}
                onClick={() => router.push("/login")}
              >
                Sign in
              </Button>
            </p>
          </div>
        </section>
      </div>

      <footer className={styles.authFooter}>
        <a href="#privacy">PRIVACY POLICY</a>
        <a href="#terms">TERMS OF SERVICE</a>
        <a href="#support">CONTACT SUPPORT</a>
      </footer>
    </>
  );
};

export default Register;
