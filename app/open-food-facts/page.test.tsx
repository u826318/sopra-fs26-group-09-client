/* eslint-disable @typescript-eslint/no-explicit-any, react/display-name */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import OpenFoodFactsPage from "@/open-food-facts/page";

const pushMock = jest.fn();
const getMock = jest.fn();

jest.mock("@/components/products/ProductResultCard", () =>
  function MockProductResultCard({ product, label, exportContext }: any) {
    return (
      <div data-testid="product-result-card">
        <span>{label}</span>
        <span>{product.name}</span>
        <span>{exportContext}</span>
      </div>
    );
  },
);

jest.mock("antd", () => {
  const Button = ({ children, onClick, loading, htmlType, ...props }: any) => (
    <button
      type={htmlType ?? "button"}
      onClick={onClick}
      data-loading={loading ? "true" : "false"}
      {...props}
    >
      {children}
    </button>
  );

  const Card = ({ children }: any) => <div>{children}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Empty = ({ description }: any) => <div>{description}</div>;
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

  const Form = ({ children }: any) => <form>{children}</form>;
  Form.Item = ({ children, label }: any) => (
    <label>
      {label}
      {children}
    </label>
  );

  const Input = ({ value, onChange, placeholder }: any) => (
    <input aria-label={placeholder} value={value} onChange={onChange} placeholder={placeholder} />
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
  useApi: () => ({ get: getMock }),
}));

describe("Open Food Facts page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.alert = jest.fn();
  });

  it("looks up a barcode and renders the returned product card", async () => {
    getMock.mockResolvedValueOnce({ name: "Fanta Zero", barcode: "90331701" });

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

  it("searches products and renders the priority result plus result list", async () => {
    getMock.mockResolvedValueOnce([
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
    expect(screen.getByText("All possible results returned for this search")).toBeInTheDocument();
    expect(screen.getByText(/1\. Plant Based Caprese — V-Love/)).toBeInTheDocument();
    expect(screen.getByText(/2\. Plant Based Mozzarella — V-Love/)).toBeInTheDocument();
  });

  it("alerts and clears the barcode result when barcode lookup fails", async () => {
    getMock.mockRejectedValueOnce(new Error("lookup failed"));

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
