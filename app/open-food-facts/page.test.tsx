/* eslint-disable @typescript-eslint/no-explicit-any, react/display-name */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import OpenFoodFactsPage from "./page";

const getMock = jest.fn();
const pushMock = jest.fn();

jest.mock("@/components/products/ProductResultCard", () => (props: any) => (
  <div>
    <div>{props.product.name}</div>
    <div>{props.product.barcode}</div>
    <div>{props.pantryContext ? `pantry:${props.pantryContext.householdId}:${props.pantryContext.householdName}` : "no-pantry"}</div>
  </div>
));

jest.mock("antd", () => {
  const Card = ({ children }: any) => <div>{children}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Empty = ({ description }: any) => <div>{description}</div>;
  const Input = ({ value, onChange, onPressEnter, placeholder }: any) => (
    <input
      aria-label={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onPressEnter?.(event);
        }
      }}
      placeholder={placeholder}
    />
  );

  const Typography = {
    Title: ({ children }: any) => <h1>{children}</h1>,
    Paragraph: ({ children }: any) => <p>{children}</p>,
  };

  return { Card, Empty, Input, Space, Typography };
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

    expect(screen.getByText("Fanta Zero")).toBeInTheDocument();
  });

  it("triggers lookup when Enter is pressed in the barcode field", async () => {
    getMock.mockResolvedValue({ name: "Enter Product", barcode: "5000168198514" });

    render(<OpenFoodFactsPage />);

    fireEvent.change(screen.getByLabelText("e.g. 3017624010701"), {
      target: { value: "5000168198514" },
    });
    fireEvent.keyDown(screen.getByLabelText("e.g. 3017624010701"), { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/products/lookup?barcode=5000168198514");
    });
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

  it("shows an inline message when the barcode lookup fails", async () => {
    getMock.mockRejectedValue(new Error("lookup failed"));

    render(<OpenFoodFactsPage />);

    fireEvent.change(screen.getByLabelText("e.g. 3017624010701"), {
      target: { value: "0000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Look up barcode" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cannot find the item using the barcode.",
    );
    expect(globalThis.alert).not.toHaveBeenCalledWith("lookup failed");
    expect(screen.queryByText("No product loaded yet.")).not.toBeInTheDocument();
  });

  it("navigates back to the household page", () => {
    render(<OpenFoodFactsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Back to household page" }));

    expect(pushMock).toHaveBeenCalledWith("/stats");
  });
});
