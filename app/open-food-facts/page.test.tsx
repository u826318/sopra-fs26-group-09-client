/* eslint-disable @typescript-eslint/no-explicit-any, react/display-name */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import OpenFoodFactsPage from "./page";

const getMock = jest.fn();
const postFormDataMock = jest.fn();
const postMock = jest.fn();
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

  const Collapse = ({ items }: any) => (
    <div>
      {items.map((item: any) => (
        <div key={item.key}>
          <div>{item.label}</div>
          <div>{item.children}</div>
        </div>
      ))}
    </div>
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

  const Tabs = ({ items }: any) => (
    <div>
      {items.map((item: any) => (
        <section key={item.key}>
          <h2>{item.label}</h2>
          <div>{item.children}</div>
        </section>
      ))}
    </div>
  );

  const Typography = {
    Title: ({ children }: any) => <h1>{children}</h1>,
    Paragraph: ({ children }: any) => <p>{children}</p>,
  };

  return { Button, Card, Collapse, Empty, Form, Input, Space, Tabs, Typography };
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({ get: getMock, post: postMock, postFormData: postFormDataMock }),
}));

jest.mock("@/hooks/useSessionStorage", () => ({
  __esModule: true,
  default: (key: string, defaultValue: string) => ({
    value: key === "token" ? "demo-token" : defaultValue,
    set: jest.fn(),
    clear: jest.fn(),
  }),
}));

describe("Debug portal page", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.alert = jest.fn();
    window.history.pushState({}, "", "/open-food-facts");
    sessionStorage.clear();

    postMock.mockResolvedValue({ token: "demo-token", username: "debug-demo" });

    URL.createObjectURL = jest.fn(() => "blob:receipt-preview");
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
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

  it("searches products and renders results", async () => {
    getMock.mockResolvedValue([
      { name: "Plant Based Caprese", brand: "V-Love", barcode: "1" },
      { name: "Plant Based Mozzarella", brand: "V-Love", barcode: "2" },
    ]);

    render(<OpenFoodFactsPage />);

    fireEvent.change(screen.getByLabelText("e.g. plant based caprese"), {
      target: { value: "plant based caprese" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search Open Food Facts" }));

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith(
        "/products/search?q=plant%20based%20caprese&limit=12",
      );
    });

    expect(screen.getByText("Top match")).toBeInTheDocument();
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

describe("Receipt image upload in the debug portal", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    postMock.mockResolvedValue({ token: "demo-token", username: "debug-demo" });
    postFormDataMock.mockReset();

    URL.createObjectURL = jest.fn(() => "blob:receipt-preview");
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("shows a local preview after selecting a receipt image", () => {
    render(<OpenFoodFactsPage />);

    fireEvent.change(screen.getByLabelText("Upload receipt image"), {
      target: {
        files: [new File(["receipt"], "receipt.png", { type: "image/png" })],
      },
    });

    expect(screen.getByText("receipt.png")).toBeInTheDocument();
    expect(screen.getByAltText("Uploaded receipt preview")).toHaveAttribute(
      "src",
      "blob:receipt-preview",
    );
  });

  it("posts the selected image to the receipt analysis endpoint and renders the result", async () => {
    postFormDataMock.mockResolvedValueOnce({
      status: "succeeded",
      merchantName: "Migros",
      transactionDate: "2026-04-20",
      total: "12.50 CHF",
      items: [
        {
          description: "Milk",
          quantity: "2",
          price: "1.20 CHF",
          totalPrice: "2.40 CHF",
          productCode: null,
          rawItem: null,
        },
      ],
      extractedFields: { MerchantName: "Migros" },
      rawResult: { status: "succeeded" },
      rawText: "Migros milk 2.40 CHF",
    });

    render(<OpenFoodFactsPage />);

    fireEvent.change(screen.getByLabelText("Upload receipt image"), {
      target: {
        files: [new File(["receipt"], "receipt.png", { type: "image/png" })],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Analyze with Azure receipt model" }));

    await waitFor(() => {
      expect(postFormDataMock).toHaveBeenCalledTimes(1);
    });

    const [endpoint, formData] = postFormDataMock.mock.calls[0];
    expect(endpoint).toBe("/products/receipt/analyze");
    expect(formData).toBeInstanceOf(FormData);

    await screen.findByText("Store and totals");
    expect(screen.getAllByText("Migros").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Milk").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2.40 CHF").length).toBeGreaterThan(0);
    expect(screen.getByText("Migros milk 2.40 CHF")).toBeInTheDocument();
  });
});