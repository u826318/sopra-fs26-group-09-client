/* eslint-disable @typescript-eslint/no-explicit-any, react/display-name */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import HouseholdPantryPage from "@/households/[id]/page";

const pushMock = jest.fn();
const getMock = jest.fn();
const postMock = jest.fn();
const messageMock = {
  error: jest.fn(),
  success: jest.fn(),
  info: jest.fn(),
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ id: "10" }),
}));

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({ get: getMock, post: postMock }),
}));

jest.mock("@/hooks/useLocalStorage", () => ({
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
        value: [{ householdId: 10, name: "Test House", inviteCode: "ABC123", ownerId: 1, role: "owner" }],
        set: jest.fn(),
        clear: jest.fn(),
      };
    }
    return { value: "", set: jest.fn(), clear: jest.fn() };
  },
}));

jest.mock("@/hooks/usePantryWebSocket", () => ({
  usePantryWebSocket: ({ onMessage }: { onMessage: (msg: unknown) => void }) => {
    (global as any).__wsOnMessage = onMessage;
    return { connected: (global as any).__wsConnected ?? true };
  },
}));

jest.mock("@ant-design/icons", () => ({
  MinusCircleOutlined: () => <span data-testid="minus-icon" />,
}));

jest.mock("antd", () => {
  const Button = ({ children, onClick, disabled }: any) => (
    <button type="button" onClick={onClick} disabled={disabled}>{children}</button>
  );
  const Card = ({ children, loading }: any) => (
    loading ? <div>loading</div> : <div>{children}</div>
  );
  const Empty = ({ description }: any) => <div>{description}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Table = ({ dataSource, columns }: any) => {
    const actionsCol = (columns ?? []).find((c: any) => c.key === "actions");
    return (
      <table>
        <tbody>
          {(dataSource ?? []).map((row: any) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.barcode}</td>
              {actionsCol ? <td>{actionsCol.render(null, row)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };
  const Typography = {
    Title: ({ children }: any) => <h1>{children}</h1>,
    Paragraph: ({ children }: any) => <p>{children}</p>,
    Text: ({ children }: any) => <span>{children}</span>,
  };
  const Alert = ({ message: msg }: any) => (
    <div role="alert">{msg}</div>
  );
  const Modal = ({ children, open, title, onOk, onCancel }: any) =>
    open ? (
      <div role="dialog">
        <div>{title}</div>
        {children}
        <button type="button" onClick={onOk}>Log consumption</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    ) : null;
  const FormItem = ({ children, label }: any) => (
    <div>{label ? <label>{label}</label> : null}{children}</div>
  );
  const Form = Object.assign(
    ({ children }: any) => <form>{children}</form>,
    {
      Item: FormItem,
      useForm: () => [
        {
          setFieldsValue: jest.fn(),
          validateFields: async () => ({ quantity: 1 }),
          getFieldValue: jest.fn(),
        },
      ],
    },
  );
  const InputNumber = () => <input aria-label="quantity-input" />;
  const App = {
    useApp: () => ({ message: messageMock }),
  };

  return {
    Button,
    Card,
    Empty,
    Space,
    Table,
    Typography,
    Alert,
    Modal,
    Form,
    InputNumber,
    App,
  };
});

const samplePantry = {
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
};

describe("Household pantry page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).__wsConnected = true;
    (global as any).__wsOnMessage = undefined;
  });

  it("shows the pantry item total as the sum of row counts, not the number of entries", async () => {
    getMock.mockResolvedValueOnce(samplePantry);

    render(<HouseholdPantryPage />);

    await waitFor(() => {
      expect(screen.getByText("Test House")).toBeInTheDocument();
    });

    expect(await screen.findByText("Chocolate Bar")).toBeInTheDocument();
    expect(await screen.findByText("Granola")).toBeInTheDocument();
    expect(await screen.findByText("750.00")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("navigates to the OFF portal with the active household context", async () => {
    getMock.mockResolvedValueOnce({ items: [], totalCalories: 0 });

    render(<HouseholdPantryPage />);

    const addBtn = await screen.findByRole("button", { name: "Add item from OFF portal" });
    fireEvent.click(addBtn);

    expect(pushMock).toHaveBeenCalledWith(
      "/open-food-facts?householdId=10&householdName=Test%20House",
    );
  });

  it("shows an error message when the pantry request fails", async () => {
    getMock.mockRejectedValueOnce(new Error("pantry fetch failed"));

    render(<HouseholdPantryPage />);

    await waitFor(() => {
      expect(screen.getByText("pantry fetch failed")).toBeInTheDocument();
    });
  });

  it("shows a disconnect alert when WebSocket is not connected", async () => {
    (global as any).__wsConnected = false;
    getMock.mockResolvedValueOnce({ items: [], totalCalories: 0 });

    render(<HouseholdPantryPage />);

    // Wait for loading to finish (Card shows children, not "loading")
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Connection lost")).toBeInTheDocument();
  });

  it("does not show the disconnect alert when WebSocket is connected", async () => {
    (global as any).__wsConnected = true;
    getMock.mockResolvedValueOnce({ items: [], totalCalories: 0 });

    render(<HouseholdPantryPage />);

    // Wait for loading to finish before asserting absence of alert
    await waitFor(() => {
      expect(screen.queryByText("loading")).not.toBeInTheDocument();
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("opens consume modal when Consume button is clicked", async () => {
    getMock.mockResolvedValueOnce(samplePantry);

    render(<HouseholdPantryPage />);

    await waitFor(() => {
      expect(screen.getByText("Chocolate Bar")).toBeInTheDocument();
    });

    const consumeButtons = screen.getAllByRole("button", { name: /consume/i });
    // First consume button belongs to the first row (Chocolate Bar)
    fireEvent.click(consumeButtons[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Consume — Chocolate Bar/)).toBeInTheDocument();
  });

  it("refetches pantry when a WebSocket message arrives", async () => {
    getMock
      .mockResolvedValueOnce(samplePantry)
      .mockResolvedValueOnce({ items: [], totalCalories: 0 });

    render(<HouseholdPantryPage />);

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledTimes(1);
    });

    (global as any).__wsOnMessage({ eventType: "ITEM_ADDED" });

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledTimes(2);
    });
  });
});
