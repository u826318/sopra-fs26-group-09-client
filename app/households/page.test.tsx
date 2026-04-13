/* eslint-disable @typescript-eslint/no-explicit-any, react/display-name */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import HouseholdsPage from "@/households/page";

const pushMock = jest.fn();
const clearTokenMock = jest.fn();
const clearUsernameMock = jest.fn();
const successMock = jest.fn();
const errorMock = jest.fn();
const warningMock = jest.fn();
const infoMock = jest.fn();
const setHouseholdsMock = jest.fn();
const confirmMock = jest.fn(() => true);
let mockStoredHouseholds: any[] = [];

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;
Object.defineProperty(window, "confirm", { value: confirmMock, writable: true });

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/utils/domain", () => ({
  getApiDomain: () => "http://localhost:8080",
}));

jest.mock("@/hooks/useLocalStorage", () => ({
  __esModule: true,
  default: (key: string) => {
    if (key === "token") {
      return { value: "stored-token", set: jest.fn(), clear: clearTokenMock };
    }
    if (key === "username") {
      return { value: "tingting-xu824", set: jest.fn(), clear: clearUsernameMock };
    }
    if (key === "households") {
      return { value: mockStoredHouseholds, set: setHouseholdsMock, clear: jest.fn() };
    }
    return { value: "", set: jest.fn(), clear: jest.fn() };
  },
}));

jest.mock("antd", () => {
  const App = {
    useApp: () => ({
      message: { success: successMock, error: errorMock, warning: warningMock, info: infoMock },
    }),
  };

  const ConfigProvider = ({ children }: any) => <>{children}</>;
  const Avatar = ({ children }: any) => <span>{children}</span>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Row = ({ children }: any) => <div>{children}</div>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Card = ({ children }: any) => <div>{children}</div>;
  const Tag = ({ children }: any) => <span>{children}</span>;
  const Table = ({ dataSource }: any) => <div>rows:{dataSource?.length ?? 0}</div>;

  const Input = ({ value, onChange, placeholder, onPressEnter }: any) => (
    <input
      aria-label={placeholder}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={onChange}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onPressEnter) {
          onPressEnter(e);
        }
      }}
    />
  );

  const Button = ({ children, onClick, loading, icon, type, htmlType, disabled }: any) => (
    <button
      type={htmlType ?? "button"}
      onClick={onClick}
      disabled={disabled}
      data-loading={loading ? "true" : undefined}
      data-variant={type}
    >
      {icon}
      {children}
    </button>
  );

  const Typography = {
    Title: ({ children }: any) => <h1>{children}</h1>,
    Paragraph: ({ children }: any) => <p>{children}</p>,
  };

  return {
    App,
    Avatar,
    Button,
    Card,
    Col,
    ConfigProvider,
    Input,
    Row,
    Space,
    Table,
    Tag,
    Typography,
    theme: { defaultAlgorithm: {} },
  };
});

jest.mock("@ant-design/icons", () => ({
  DashboardOutlined: () => <span>icon</span>,
  HomeOutlined: () => <span>icon</span>,
  InboxOutlined: () => <span>icon</span>,
  ReadOutlined: () => <span>icon</span>,
  LogoutOutlined: () => <span>icon</span>,
  PlusCircleOutlined: () => <span>icon</span>,
}));

const mockJsonResponse = (ok: boolean, body: unknown, status = 200, statusText = "OK") =>
  Promise.resolve({
    ok,
    status,
    statusText,
    json: async () => body,
  } as Response);

describe("Households page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockStoredHouseholds = [];
    confirmMock.mockReturnValue(true);
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (options?.method === "GET" && url === "http://localhost:8080/households") {
        return mockJsonResponse(true, mockStoredHouseholds);
      }
      return mockJsonResponse(true, {});
    });
  });

  it("renders navigation and username from storage", async () => {
    render(<HouseholdsPage />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Households")).toBeInTheDocument();
    expect(screen.getByText("Pantry")).toBeInTheDocument();
    expect(screen.getByText("Recipes")).toBeInTheDocument();
    expect(screen.getByText("tingting-xu824")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/households",
        expect.objectContaining({ method: "GET" }),
      );
    });
  });

  it("creates a household and reloads the households list", async () => {
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (options?.method === "GET" && url === "http://localhost:8080/households") {
        return mockJsonResponse(true, [
          {
            householdId: 10,
            name: "Test House",
            inviteCode: "ABC123",
            ownerId: 1,
            role: "owner",
          },
        ]);
      }
      if (options?.method === "POST" && url === "http://localhost:8080/households") {
        return mockJsonResponse(true, {
          householdId: 10,
          name: "Test House",
          inviteCode: "ABC123",
          ownerId: 1,
          role: "owner",
        });
      }
      return mockJsonResponse(true, {});
    });

    render(<HouseholdsPage />);

    fireEvent.change(screen.getByPlaceholderText("Enter household name"), {
      target: { value: "Test House" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create Household/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/households",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ Authorization: "stored-token" }),
        }),
      );
      expect(setHouseholdsMock).toHaveBeenCalledWith([
        {
          householdId: 10,
          name: "Test House",
          inviteCode: "ABC123",
          ownerId: 1,
          role: "owner",
        },
      ]);
      expect(successMock).toHaveBeenCalledWith("Household created successfully.");
    });
  });

  it("joins a household by invite code and reloads the households list", async () => {
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (options?.method === "GET" && url === "http://localhost:8080/households") {
        return mockJsonResponse(true, [
          {
            householdId: 22,
            name: "Joined House",
            inviteCode: "JOIN22",
            ownerId: 1,
            role: "member",
          },
        ]);
      }
      if (options?.method === "POST" && url === "http://localhost:8080/households/join") {
        return mockJsonResponse(true, {
          householdId: 22,
          name: "Joined House",
          inviteCode: "JOIN22",
          ownerId: 1,
          role: "member",
        });
      }
      return mockJsonResponse(true, {});
    });

    render(<HouseholdsPage />);

    fireEvent.change(screen.getByPlaceholderText("Enter invite code (e.g. AB-12345)"), {
      target: { value: "JOIN22" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Join Household/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/households/join",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ Authorization: "stored-token" }),
        }),
      );
      expect(setHouseholdsMock).toHaveBeenCalledWith([
        {
          householdId: 22,
          name: "Joined House",
          inviteCode: "JOIN22",
          ownerId: 1,
          role: "member",
        },
      ]);
      expect(successMock).toHaveBeenCalledWith("Joined household successfully.");
    });
  });

  it("opens the pantry detail route without trusting the name query string", async () => {
    mockStoredHouseholds = [
      {
        householdId: 10,
        name: "Test House",
        inviteCode: "ABC123",
        ownerId: 1,
        role: "owner",
      },
    ];

    render(<HouseholdsPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/households",
        expect.objectContaining({ method: "GET" }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /View Pantry/i }));
    expect(pushMock).toHaveBeenCalledWith("/households/10");
  });

  it("deletes an owned household", async () => {
    mockStoredHouseholds = [
      {
        householdId: 10,
        name: "Test House",
        inviteCode: "ABC123",
        ownerId: 1,
        role: "owner",
      },
    ];

    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (options?.method === "GET" && url === "http://localhost:8080/households") {
        return mockJsonResponse(true, []);
      }
      if (options?.method === "DELETE" && url === "http://localhost:8080/households/10") {
        return mockJsonResponse(true, undefined, 204, "No Content");
      }
      return mockJsonResponse(true, {});
    });

    render(<HouseholdsPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/households",
        expect.objectContaining({ method: "GET" }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /Delete Household/i }));

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/households/10",
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(successMock).toHaveBeenCalledWith("Household deleted successfully.");
    });
  });

  it("shows warning for empty inputs", async () => {
    render(<HouseholdsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Create Household/i }));
    fireEvent.click(screen.getByRole("button", { name: /Join Household/i }));
    expect(warningMock).toHaveBeenCalledWith("Please enter a household name.");
    expect(warningMock).toHaveBeenCalledWith("Please enter an invite code.");
  });
});
