/* eslint-disable @typescript-eslint/no-explicit-any, react/display-name */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import HouseholdPantryPage from "@/households/[id]/page";

const pushMock = jest.fn();
const getMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ id: "10" }),
}));

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({ get: getMock }),
}));

jest.mock("@/hooks/useLocalStorage", () => ({
  __esModule: true,
  default: (key: string) => {
    if (key === "username") {
      return { value: "tingting-xu824", set: jest.fn(), clear: jest.fn() };
    }
    if (key === "households") {
      return {
        value: [{ householdId: 10, name: "Cached House", inviteCode: "ABC123", ownerId: 1, role: "owner" }],
        set: jest.fn(),
        clear: jest.fn(),
      };
    }
    return { value: "", set: jest.fn(), clear: jest.fn() };
  },
}));

jest.mock("antd", () => {
  const Button = ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>;
  const Card = ({ children }: any) => <div>{children}</div>;
  const Empty = ({ description }: any) => <div>{description}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Table = ({ dataSource }: any) => (
    <table>
      <tbody>
        {dataSource.map((row: any) => (
          <tr key={row.id}>
            <td>{row.name}</td>
            <td>{row.barcode}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  const Typography = {
    Title: ({ children }: any) => <h1>{children}</h1>,
    Paragraph: ({ children }: any) => <p>{children}</p>,
    Text: ({ children }: any) => <span>{children}</span>,
  };

  return { Button, Card, Empty, Space, Table, Typography };
});

describe("Household pantry page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads household details and pantry data from the backend", async () => {
    getMock.mockImplementation((endpoint: string) => {
      if (endpoint === "/households/10") {
        return Promise.resolve({
          householdId: 10,
          name: "Backend House",
          inviteCode: "ABC123",
          ownerId: 1,
          role: "owner",
        });
      }
      if (endpoint === "/households/10/pantry") {
        return Promise.resolve({
          items: [
            {
              id: 1,
              householdId: 10,
              barcode: "7613035974685",
              name: "Chocolate Bar",
              kcalPerPackage: 250,
              count: 3,
              addedAt: "2026-04-12T10:00:00Z",
            },
          ],
          totalCalories: 750,
        });
      }
      return Promise.reject(new Error("unexpected endpoint"));
    });

    render(<HouseholdPantryPage />);

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/households/10");
      expect(getMock).toHaveBeenCalledWith("/households/10/pantry");
    });

    expect(await screen.findByText("Backend House")).toBeInTheDocument();
    expect(await screen.findByText("Chocolate Bar")).toBeInTheDocument();
    expect(await screen.findByText("750.00")).toBeInTheDocument();
  });

  it("navigates to the OFF portal with the real household context", async () => {
    getMock.mockImplementation((endpoint: string) => {
      if (endpoint === "/households/10") {
        return Promise.resolve({
          householdId: 10,
          name: "Backend House",
          inviteCode: "ABC123",
          ownerId: 1,
          role: "owner",
        });
      }
      if (endpoint === "/households/10/pantry") {
        return Promise.resolve({ items: [], totalCalories: 0 });
      }
      return Promise.reject(new Error("unexpected endpoint"));
    });

    render(<HouseholdPantryPage />);

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/households/10");
      expect(getMock).toHaveBeenCalledWith("/households/10/pantry");
    });

    await screen.findByText("Backend House");

    fireEvent.click(screen.getByRole("button", { name: "Add item from OFF portal" }));

    expect(pushMock).toHaveBeenCalledWith(
      "/open-food-facts?householdId=10",
    );
  });

  it("shows an error message when either request fails", async () => {
    getMock.mockRejectedValueOnce(new Error("household fetch failed"));

    render(<HouseholdPantryPage />);

    await waitFor(() => {
      expect(screen.getByText("household fetch failed")).toBeInTheDocument();
    });
  });
});
