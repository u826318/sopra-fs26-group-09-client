/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import HouseholdMembersPage from "@/households/[id]/members/page";

const pushMock = jest.fn();
const getMock = jest.fn();

jest.mock("@/hooks/useAuthGuard", () => ({
  useAuthGuard: () => ({ isAuthenticated: true }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: jest.fn(), replace: jest.fn() }),
  useParams: () => ({ id: "10" }),
  useSearchParams: () => ({ get: (key: string) => (key === "name" ? "Test House" : null) }),
}));

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({ get: getMock }),
}));

jest.mock("@/hooks/useSessionStorage", () => ({
  __esModule: true,
  default: () => ({ value: [], set: jest.fn(), clear: jest.fn() }),
}));

jest.mock("@/components/VirtualPantryAppShell", () => ({
  VirtualPantryAppShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("antd", () => {
  const Button = ({ children, onClick }: any) => (
    <button type="button" onClick={onClick}>{children}</button>
  );
  const Card = ({ children, loading }: any) =>
    loading ? <div>loading</div> : <div>{children}</div>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Row = ({ children }: any) => <div>{children}</div>;
  const Tag = ({ children }: any) => <span>{children}</span>;
  const Typography = {
    Title: ({ children }: any) => <h1>{children}</h1>,
    Paragraph: ({ children }: any) => <p>{children}</p>,
    Text: ({ children }: any) => <span>{children}</span>,
  };
  const App = {
    useApp: () => ({ message: { error: jest.fn(), warning: jest.fn(), success: jest.fn() } }),
  };

  return { App, Button, Card, Col, Row, Tag, Typography };
});

const sampleMembers = [
  { userId: 1, username: "alice", role: "owner", joinedAt: "2026-04-01T10:00:00Z" },
  { userId: 2, username: "bob", role: "member", joinedAt: "2026-04-05T12:00:00Z" },
];

describe("HouseholdMembersPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders household name and members on success", async () => {
    getMock.mockImplementation((url: string) => {
      if (url === "/households/10") return Promise.resolve({ householdId: 10, name: "Test House" });
      if (url === "/households/10/members") return Promise.resolve(sampleMembers);
      return Promise.reject(new Error("unexpected: " + url));
    });

    render(<HouseholdMembersPage />);

    expect(await screen.findByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("OWNER")).toBeInTheDocument();
    expect(screen.getByText("MEMBER")).toBeInTheDocument();
  });

  it("shows Members (2) count after loading", async () => {
    getMock.mockImplementation((url: string) => {
      if (url === "/households/10") return Promise.resolve({ householdId: 10, name: "Test House" });
      if (url === "/households/10/members") return Promise.resolve(sampleMembers);
      return Promise.reject(new Error("unexpected: " + url));
    });

    render(<HouseholdMembersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Members \(2\)/)).toBeInTheDocument();
    });
  });

  it("shows error message when API call fails", async () => {
    getMock.mockImplementation((url: string) => {
      if (url === "/households/10") return Promise.resolve({ householdId: 10, name: "Test House" });
      if (url === "/households/10/members") return Promise.reject(new Error("forbidden"));
      return Promise.reject(new Error("unexpected: " + url));
    });

    render(<HouseholdMembersPage />);

    await waitFor(() => {
      expect(screen.getByText("forbidden")).toBeInTheDocument();
    });
  });

  it("shows no members message when list is empty", async () => {
    getMock.mockImplementation((url: string) => {
      if (url === "/households/10") return Promise.resolve({ householdId: 10, name: "Test House" });
      if (url === "/households/10/members") return Promise.resolve([]);
      return Promise.reject(new Error("unexpected: " + url));
    });

    render(<HouseholdMembersPage />);

    await waitFor(() => {
      expect(screen.getByText("No members found.")).toBeInTheDocument();
    });
  });

  it("Back button navigates to /households", async () => {
    getMock.mockImplementation((url: string) => {
      if (url === "/households/10") return Promise.resolve({ householdId: 10, name: "Test House" });
      if (url === "/households/10/members") return Promise.resolve(sampleMembers);
      return Promise.reject(new Error("unexpected: " + url));
    });

    render(<HouseholdMembersPage />);

    await waitFor(() => {
      expect(screen.getByText("alice")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Back to households" }));
    expect(pushMock).toHaveBeenCalledWith("/households");
  });
});
