/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProductResultCard from "@/components/products/ProductResultCard";

const postMock = jest.fn();

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({ post: postMock }),
}));

jest.mock("antd", () => {
  const Image = ({ alt }: any) => <img alt={alt} />;
  const Card = ({ children }: any) => <div>{children}</div>;
  return { Card, Image };
});

describe("ProductResultCard", () => {
  const product = {
    barcode: "123456789",
    name: "Plant Based Caprese",
    brand: "V-Love",
    quantity: "180 g",
    servingSize: null,
    imageUrl: "https://example.com/image.jpg",
    productUrl: null,
    nutriScore: null,
    stores: null,
    storeTags: null,
    purchasePlaces: null,
    nutriments: { "energy-kcal_100g": 220 },
    nutriScoreData: null,
    rawProduct: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.alert = jest.fn();
  });

  it("renders only the streamlined product information", () => {
    render(
      <ProductResultCard
        product={product}
        rawTitle="All raw product fields returned by the API"
        exportContext="Search export"
      />,
    );

    expect(screen.getByText("Plant Based Caprese")).toBeInTheDocument();
    expect(screen.getByText("Brand")).toBeInTheDocument();
    expect(screen.getByText("V-Love")).toBeInTheDocument();
    expect(screen.getByText("Barcode")).toBeInTheDocument();
    expect(screen.getByText("123456789")).toBeInTheDocument();
    expect(screen.getByText("Estimated kcal / package")).toBeInTheDocument();
    expect(screen.getByText("396")).toBeInTheDocument();
    expect(screen.queryByText("Export full return as TXT")).not.toBeInTheDocument();
    expect(screen.queryByText("Nutri-Score computation data")).not.toBeInTheDocument();
  });

  it("posts a pantry item successfully when the pantry form is submitted", async () => {
    postMock.mockResolvedValueOnce({
      id: 7,
      householdId: 10,
      barcode: "123456789",
      name: "Plant Based Caprese",
      kcalPerPackage: 396,
      count: 2,
      addedAt: "2026-04-12T10:00:00Z",
    });

    render(
      <ProductResultCard
        product={product}
        rawTitle="Raw fields"
        exportContext="Pantry export"
        pantryContext={{ householdId: 10, householdName: "Test House" }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Quantity to add"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add to pantry" }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith("/households/10/pantry", {
        barcode: "123456789",
        name: "Plant Based Caprese",
        quantity: 2,
        kcalPerPackage: 396,
      });
    });

    expect(globalThis.alert).not.toHaveBeenCalledWith("Plant Based Caprese was added to Test House.");
    expect(screen.getByRole("status")).toHaveTextContent("Item successfully added to Test House.");
  });

  it("uses the householdId from the URL when pantryContext is not passed", async () => {
    window.history.pushState({}, "", "?householdId=12&householdName=URL%20House");

    postMock.mockResolvedValueOnce({
      id: 8,
      householdId: 12,
      barcode: "123456789",
      name: "Plant Based Caprese",
      kcalPerPackage: 396,
      count: 1,
      addedAt: "2026-04-12T10:00:00Z",
    });

    render(
      <ProductResultCard
        product={product}
        rawTitle="Raw fields"
        exportContext="Pantry export"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add to pantry" }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith("/households/12/pantry", {
        barcode: "123456789",
        name: "Plant Based Caprese",
        quantity: 1,
        kcalPerPackage: 396,
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent("Item successfully added to URL House.");

    window.history.pushState({}, "", "/");
  });

  it("shows a validation error and does not submit when quantity is invalid", async () => {
    render(
      <ProductResultCard
        product={product}
        rawTitle="Raw fields"
        exportContext="Pantry export"
        pantryContext={{ householdId: 10, householdName: "Test House" }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Quantity to add"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add to pantry" }));

    expect(postMock).not.toHaveBeenCalled();
    expect(globalThis.alert).toHaveBeenCalledWith("Quantity to add must be at least 1.");
  });

  it("shows the API error when adding the pantry item fails", async () => {
    postMock.mockRejectedValueOnce(new Error("backend exploded"));

    render(
      <ProductResultCard
        product={product}
        rawTitle="Raw fields"
        exportContext="Pantry export"
        pantryContext={{ householdId: 10, householdName: "Test House" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add to pantry" }));

    await waitFor(() => {
      expect(globalThis.alert).toHaveBeenCalledWith("backend exploded");
    });
  });
});
