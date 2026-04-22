/* eslint-disable @typescript-eslint/no-explicit-any, react/display-name */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import OpenFoodFactsPage from "./page";

const getMock = jest.fn();
const pushMock = jest.fn();

jest.mock("@/components/products/ProductResultCard", () => ({
  __esModule: true,
  default: ({ product, label, pantryContext }: any) => (
    <div>
      <strong>{label}</strong>
      <span>{product?.name}</span>
      {pantryContext ? (
        <span>{`pantry:${pantryContext.householdId}:${pantryContext.householdName ?? ""}`}</span>
      ) : null}
    </div>
  ),
}));

jest.mock("antd", () => {
  const Button = ({ children, onClick, loading, disabled, htmlType }: any) => {
    const nativeType =
      htmlType === "submit" || htmlType === "reset" || htmlType === "button"
        ? htmlType
        : "button";

    return (
      <button
        type={nativeType}
        onClick={onClick}
        disabled={disabled}
        data-loading={loading ? "true" : "false"}
      >
        {children}
      </button>
    );
  };

  const Card = ({ children, title }: any) => (
    <section>
      {title ? <h3>{title}</h3> : null}
      {children}
    </section>
  );

  const Empty = ({ description }: any) => <div>{description}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;

  const Form = ({ children }: any) => <form>{children}</form>;
  Form.Item = ({ children, label }: any) => (
    <label>
      {label}
      {children}
    </label>
  );

  const Input = ({ value, onChange, placeholder }: any) => (
    <input
      aria-label={placeholder}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );

  const Typography = {
    Title: ({ children }: any) => <h1>{children}</h1>,
    Paragraph: ({ children }: any) => <p>{children}</p>,
  };

  return { Button, Card, Empty, Form, Input, Space, Typography };
});

jest.mock("@/hooks/useAuthGuard", () => ({
  useAuthGuard: () => ({ isAuthenticated: true }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({ get: getMock }),
}));

describe("Open Food Facts page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.alert = jest.fn();
    window.history.pushState({}, "", "/open-food-facts");
    sessionStorage.clear();
  });

  it("looks up a barcode and renders the returned product card", async () => {
    getMock.mockResolvedValue({ name: "Fanta Zero", barcode: "90331701" });

    render(<OpenFoodFactsPage />);

    fireEvent.change(screen.getByLabelText("e.g. 3017624010701"), {
      target: { value: "90331701" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Look up barcode" }));

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/products/lookup?barcode=90331701");
    });

    expect(screen.getByText("Barcode result")).toBeInTheDocument();
    expect(screen.getByText("Fanta Zero")).toBeInTheDocument();
  });

  it("AUTO lookup when barcode is passed via query params", async () => {
    window.history.pushState(
      {},
      "",
      "/open-food-facts?barcode=9999&householdId=5&householdName=Test",
    );

    getMock.mockResolvedValue({ name: "Auto Product", barcode: "9999" });

    render(<OpenFoodFactsPage />);

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/products/lookup?barcode=9999");
    });

    expect(screen.getByText("Auto Product")).toBeInTheDocument();
    expect(screen.getByText("pantry:5:Test")).toBeInTheDocument();
  });

  it("alerts on barcode lookup failure", async () => {
    getMock.mockRejectedValue(new Error("lookup failed"));

    render(<OpenFoodFactsPage />);

    fireEvent.change(screen.getByLabelText("e.g. 3017624010701"), {
      target: { value: "0000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Look up barcode" }));

    await waitFor(() => {
      expect(globalThis.alert).toHaveBeenCalledWith("lookup failed");
    });

    expect(screen.getByText("No barcode result yet.")).toBeInTheDocument();
  });
});
