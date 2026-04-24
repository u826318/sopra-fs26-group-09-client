/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import HouseholdPantryPage from "@/households/[id]/page";

const pushMock = jest.fn();
const getMock = jest.fn();
const warningMock = jest.fn();
const setHouseholdsMock = jest.fn();
const clearSelectedHouseholdIdMock = jest.fn();

jest.mock("@/hooks/useAuthGuard", () => ({
  useAuthGuard: () => ({ isAuthenticated: true }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ id: "10" }),
}));

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({ get: getMock }),
}));

jest.mock("@/hooks/usePantryWebSocket", () => ({
  usePantryWebSocket: () => ({ connected: false, hasConnectedOnce: false }),
}));

jest.mock("@/hooks/useSessionStorage", () => ({
  __esModule: true,
  default: (key: string) => {
    if (key === "username") {
      return { value: "tingting-xu824", set: jest.fn(), clear: jest.fn() };
    }
    if (key === "token") {
      return { value: "test-token", set: jest.fn(), clear: jest.fn() };
    }
    if (key === "households") {
      return {
        value: [
          {
            householdId: 10,
            name: "Test House",
            inviteCode: "ABC123",
            ownerId: 1,
            role: "owner",
          },
        ],
        set: setHouseholdsMock,
        clear: jest.fn(),
      };
    }
    if (key === "selectedHouseholdId") {
      return { value: null, set: jest.fn(), clear: clearSelectedHouseholdIdMock };
    }
    return { value: "", set: jest.fn(), clear: jest.fn() };
  },
}));

jest.mock("antd", () => {
  const App = {
    useApp: () => ({
      message: { warning: warningMock, error: jest.fn(), success: jest.fn(), info: jest.fn() },
    }),
  };

  const Button = ({ children, onClick, loading, icon, ...props }: any) => (
    <button onClick={onClick} data-loading={loading ? "true" : "false"} {...props}>
      {icon}
      {children}
    </button>
  );

  const Card = ({ children, title, extra }: any) => (
    <div>
      {title ? <div>{title}</div> : null}
      {extra ? <div>{extra}</div> : null}
      <div>{children}</div>
    </div>
  );

  const Empty = ({ description }: any) => <div>{description}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;

  const Alert = ({ message, description }: any) => (
    <div>
      <div>{message}</div>
      <div>{description}</div>
    </div>
  );

  const Row = ({ children }: any) => <div>{children}</div>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Tag = ({ children }: any) => <span>{children}</span>;

  const Table = ({ dataSource }: any) => (
    <table>
      <tbody>
        {dataSource.map((row: any) => (
          <tr key={row.id}>
            <td>{row.name}</td>
            <td>{row.barcode}</td>
            <td>{row.kcalPerPackage}</td>
            <td>{row.count}</td>
            <td>{row.addedAt}</td>
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

  return {
    App,
    Button,
    Card,
    Empty,
    Space,
    Table,
    Typography,
    Alert,
    Row,
    Col,
    Tag,
  };
});

describe("Household pantry page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.pushState({}, "", "/households/10?name=Test%20House");
  });

  it("shows the pantry item total as the sum of row counts, not the number of entries", async () => {
    getMock.mockResolvedValue({
      items: [
        {
          id: 1,
          householdId: 10,
          barcode: "7613035974685",
          name: "Chocolate Bar",
          kcalPerPackage: 250,
          count: 2,
          addedAt: "2026-04-12T10:00:00Z",
        },
        {
          id: 2,
          householdId: 10,
          barcode: "7613031234567",
          name: "Granola",
          kcalPerPackage: 250,
          count: 1,
          addedAt: "2026-04-13T10:00:00Z",
        },
      ],
      totalCalories: 750,
    });

    render(<HouseholdPantryPage />);

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/households/10/pantry");
    });

    await waitFor(() => {
      expect(screen.getByText("Test House")).toBeInTheDocument();
      expect(screen.getByText("Chocolate Bar")).toBeInTheDocument();
      expect(screen.getByText("Granola")).toBeInTheDocument();
      expect(screen.getByText("750 kcal")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("navigates to the OFF portal with the active household context", async () => {
    getMock.mockResolvedValue({ items: [], totalCalories: 0 });

    render(<HouseholdPantryPage />);

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/households/10/pantry");
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Add item from OFF portal/i }),
    );

    expect(pushMock).toHaveBeenCalledWith(
      "/open-food-facts?householdId=10&householdName=Test%20House",
    );
  });

  it("navigates to the scan page with the active household context", async () => {
    getMock.mockResolvedValue({ items: [], totalCalories: 0 });

    render(<HouseholdPantryPage />);

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/households/10/pantry");
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Scan product image/i }),
    );

    expect(pushMock).toHaveBeenCalledWith(
      "/pantry/add/scan?householdId=10&householdName=Test%20House",
    );
  });

  it("shows an error message when the pantry request fails with a non-404 error", async () => {
    getMock.mockRejectedValue(new Error("pantry fetch failed"));

    render(<HouseholdPantryPage />);

    await waitFor(() => {
      expect(screen.getByText("Pantry data could not be loaded")).toBeInTheDocument();
      expect(screen.getByText("pantry fetch failed")).toBeInTheDocument();
    });
  });

  it("redirects to /households and removes the household from cache when the pantry returns 404", async () => {
    const notFoundError = Object.assign(new Error("Not found"), { status: 404, info: "" });
    getMock.mockRejectedValue(notFoundError);

    render(<HouseholdPantryPage />);

    await waitFor(() => {
      expect(setHouseholdsMock).toHaveBeenCalledWith([]);
      expect(clearSelectedHouseholdIdMock).toHaveBeenCalled();
      expect(warningMock).toHaveBeenCalledWith("This household no longer exists.");
      expect(pushMock).toHaveBeenCalledWith("/households");
    });
  });
});
