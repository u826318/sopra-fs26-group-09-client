/* eslint-disable @typescript-eslint/no-explicit-any, react/display-name */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProductResultCard from "@/components/products/ProductResultCard";

const exportProductAsTextMock = jest.fn();
const postMock = jest.fn();

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({ post: postMock }),
}));

jest.mock("@/utils/productExport", () => ({
  exportProductAsText: (...args: any[]) => exportProductAsTextMock(...args),
}));

jest.mock("antd", () => {
  const Button = ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>;
  const Tag = ({ children }: any) => <span>{children}</span>;
  const Empty = ({ description }: any) => <div>{description}</div>;
  const Image = ({ alt }: any) => <img alt={alt} />;
  const Space = ({ children }: any) => <div>{children}</div>;

  const Card = ({ children, title }: any) => (
    <div>
      <div>{title}</div>
      <div>{children}</div>
    </div>
  );

  const Descriptions: any = ({ children }: any) => <div>{children}</div>;
  Descriptions.Item = ({ label, children }: any) => (
    <div>
      <strong>{label}</strong>
      <span>{children}</span>
    </div>
  );

  const Table = ({ dataSource }: any) => (
    <table>
      <tbody>
        {dataSource.map((row: any) => (
          <tr key={row.key}>
            <td>{row.name}</td>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
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

  const Typography = {
    Text: ({ children, strong }: any) => (strong ? <strong>{children}</strong> : <span>{children}</span>),
  };

  return { Button, Card, Collapse, Descriptions, Empty, Image, Space, Table, Tag, Typography };
});

describe("ProductResultCard", () => {
  const product = {
    barcode: "123456789",
    name: "Plant Based Caprese",
    brand: "V-Love",
    quantity: "180 g",
    servingSize: "100 g",
    imageUrl: "https://example.com/image.jpg",
    productUrl: "https://example.com/product",
    nutriScore: "b",
    stores: ["Migros"],
    storeTags: ["migros"],
    purchasePlaces: ["Zurich"],
    nutriments: {
      proteins_100g: 12,
      random_field: "abc",
      "energy-kcal_100g": 220,
    },
    nutriScoreData: {
      score: 5,
    },
    rawProduct: {
      code: "123456789",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the key product information and nutrition rows", () => {
    render(
      <ProductResultCard
        product={product}
        label="Top match"
        rawTitle="All raw product fields returned by the API"
        exportContext="Search export"
      />,
    );

    expect(screen.getByText("Plant Based Caprese")).toBeInTheDocument();
    expect(screen.getByText("Top match")).toBeInTheDocument();
    expect(screen.getByText("Open product page")).toBeInTheDocument();
    expect(screen.getByText("Migros")).toBeInTheDocument();
    expect(screen.getByText("energy-kcal_100g")).toBeInTheDocument();
    expect(screen.getByText("220")).toBeInTheDocument();
    expect(screen.getByText("proteins_100g")).toBeInTheDocument();
    expect(screen.getByText("abc")).toBeInTheDocument();
    expect(screen.getByText("Nutri-Score computation data")).toBeInTheDocument();
  });

  it("exports the product when the export button is clicked", () => {
    render(
      <ProductResultCard
        product={product}
        label="Top match"
        rawTitle="All raw product fields returned by the API"
        exportContext="Search export"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Export full return as TXT" }));

    expect(exportProductAsTextMock).toHaveBeenCalledWith(product, "Search export");
  });

  it("shows placeholders when optional fields are missing and no nutrition is returned", () => {
    render(
      <ProductResultCard
        product={{
          ...product,
          barcode: null,
          brand: null,
          quantity: null,
          servingSize: null,
          imageUrl: null,
          productUrl: null,
          nutriScore: null,
          stores: [],
          storeTags: [],
          purchasePlaces: [],
          nutriments: null,
        }}
        rawTitle="Raw fields"
        exportContext="Empty export"
      />,
    );

    expect(screen.getByText("No nutrition fields were returned for this item.")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("posts a pantry item successfully when the pantry form is submitted", async () => {
    const onPantryItemAdded = jest.fn();
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
        onPantryItemAdded={onPantryItemAdded}
      />,
    );

    expect(screen.getByDisplayValue("396")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Package count"), {
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

    expect(onPantryItemAdded).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, householdId: 10 }),
    );
    expect(screen.getByText("Plant Based Caprese was added to Test House.")).toBeInTheDocument();
  });

  it("shows a validation error and does not submit when package count is invalid", async () => {
    render(
      <ProductResultCard
        product={product}
        rawTitle="Raw fields"
        exportContext="Pantry export"
        pantryContext={{ householdId: 10, householdName: "Test House" }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Package count"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add to pantry" }));

    expect(postMock).not.toHaveBeenCalled();
    expect(screen.getByText("Package count must be at least 1.")).toBeInTheDocument();
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
      expect(screen.getByText("backend exploded")).toBeInTheDocument();
    });
  });
});
