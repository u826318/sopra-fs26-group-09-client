/* eslint-disable @typescript-eslint/no-explicit-any, react/display-name */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import UsersPage from "@/users/page";

const pushMock = jest.fn();
const getMock = jest.fn();
const postMock = jest.fn();
const clearTokenMock = jest.fn();
const apiMock = { get: getMock, post: postMock };

jest.mock("antd", () => {
  const Card = ({ children, title, loading }: any) => (
    <div>
      <div>{title}</div>
      <div>{loading ? "loading" : children}</div>
    </div>
  );

  const Button = ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  );

  const Space = ({ children }: any) => <div>{children}</div>;

  const Table = ({ dataSource, onRow }: any) => (
    <div>
      {dataSource.map((row: any) => {
        const rowProps = onRow ? onRow(row) : {};
        return (
          <div
            key={row.id}
            data-testid={`user-row-${row.id}`}
            onClick={rowProps.onClick}
            style={rowProps.style}
          >
            {row.username}
          </div>
        );
      })}
    </div>
  );

  return { Button, Card, Space, Table };
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/hooks/useApi", () => ({
  useApi: () => apiMock,
}));

jest.mock("@/hooks/useLocalStorage", () => ({
  __esModule: true,
  default: () => ({ value: "stored-token", clear: clearTokenMock }),
}));

describe("Users page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.alert = jest.fn();
  });

  it("fetches users on mount and navigates when a row is clicked", async () => {
    getMock.mockResolvedValueOnce([
      { id: 1, username: "tingting", name: "Ting Ting" },
      { id: 2, username: "yifu", name: "Yifu" },
    ]);

    render(<UsersPage />);

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/users");
    });
    const secondUserRow = await screen.findByTestId("user-row-2");

    fireEvent.click(secondUserRow);
    expect(pushMock).toHaveBeenCalledWith("/users/2");
  });

  it("logs out through the API, clears the token, and redirects to login", async () => {
    getMock.mockResolvedValueOnce([{ id: 1, username: "tingting", name: "Ting Ting" }]);
    postMock.mockResolvedValueOnce({});

    render(<UsersPage />);

    await screen.findByTestId("user-row-1");
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith("/users/logout", { token: "stored-token" });
      expect(clearTokenMock).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });

  it("alerts when fetching users fails", async () => {
    getMock.mockRejectedValueOnce(new Error("boom"));

    render(<UsersPage />);

    await waitFor(() => {
      expect(globalThis.alert).toHaveBeenCalledWith(
        "Something went wrong while fetching users:\nboom",
      );
    });
  });
});
