/* eslint-disable @typescript-eslint/no-explicit-any, react/display-name */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import StatsPage from "@/stats/page";

const pushMock = jest.fn();
const getMock = jest.fn();
const putMock = jest.fn();
const messageMock = {
  warning: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/components/VirtualPantryAppShell", () => ({
  VirtualPantryAppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
}));

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({ get: getMock, put: putMock }),
}));

jest.mock("@/hooks/useLocalStorage", () => ({
  __esModule: true,
  default: (key: string) => {
    if (key === "selectedHouseholdId") {
      return { value: 1, set: jest.fn(), clear: jest.fn() };
    }
    if (key === "households") {
      return {
        value: [
          {
            householdId: 1,
            name: "Test Home",
            inviteCode: "abc",
            ownerId: 99,
            role: "owner",
          },
        ],
        set: jest.fn(),
        clear: jest.fn(),
      };
    }
    return { value: null, set: jest.fn(), clear: jest.fn() };
  },
}));

jest.mock("@ant-design/icons", () => ({
  EditOutlined: () => <span data-testid="edit-icon" />,
  WarningOutlined: () => <span data-testid="warn-icon" />,
  RestOutlined: () => <span data-testid="rest-icon" />,
  MinusCircleOutlined: () => <span data-testid="minus-icon" />,
}));

jest.mock("antd", () => {
  const Button = ({ children, onClick, loading, type, icon }: any) => (
    <button type="button" onClick={onClick} data-loading={loading ? "true" : "false"} data-btn-type={type}>
      {icon}
      {children}
    </button>
  );
  const Card = ({ children, title, extra }: any) => (
    <div>
      <div>{title}</div>
      {extra ? <div data-testid="card-extra">{extra}</div> : null}
      <div>{children}</div>
    </div>
  );
  const Space = ({ children }: any) => <div>{children}</div>;
  const Spin = () => <div>Loading...</div>;
  const Empty = ({ description }: any) => <div>{description}</div>;
  Empty.PRESENTED_IMAGE_SIMPLE = "simple";
  const Tag = ({ children }: any) => <span>{children}</span>;
  const Table = ({ dataSource, rowKey }: any) => (
    <table>
      <tbody>
        {dataSource?.map((row: any, i: number) => (
          <tr key={row[rowKey] ?? row.date ?? i}>
            <td>{row.date ?? row.name ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  const Select = () => <div data-testid="select" />;
  const DatePicker = ({ onChange, value }: any) => (
    <input
      aria-label="start-date"
      data-testid="start-date"
      onChange={() => onChange({ format: () => "2026-04-07" })}
    />
  );
  const Row = ({ children }: any) => <div>{children}</div>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Progress = ({ format }: any) => <div>{format ? format(80) : "progress"}</div>;
  const Modal = ({ children, open, title }: any) =>
    open ? (
      <div data-testid="budget-modal">
        <div>{title}</div>
        {children}
      </div>
    ) : null;
  const FormItem = ({ children, label }: any) => (
    <div>
      {label ? <label>{label}</label> : null}
      {children}
    </div>
  );
  const Form = Object.assign(
    ({ children }: any) => <form>{children}</form>,
    {
      useForm: () => [
        {
          setFieldsValue: jest.fn(),
          validateFields: async () => ({ dailyCalorieTarget: 2000 }),
        },
      ],
      useWatch: () => undefined,
      Item: FormItem,
    },
  );
  const InputNumber = () => <input aria-label="daily-calorie-target" />;
  const Typography = {
    Title: ({ children }: any) => <h1>{children}</h1>,
    Paragraph: ({ children }: any) => <p>{children}</p>,
    Text: ({ children }: any) => <span>{children}</span>,
  };
  const App = {
    useApp: () => ({ message: messageMock }),
  };

  return {
    Button,
    Card,
    Space,
    Spin,
    Empty,
    Tag,
    Table,
    Select,
    DatePicker,
    Typography,
    App,
    Row,
    Col,
    Progress,
    Modal,
    Form,
    InputNumber,
  };
});

describe("StatsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMock.mockImplementation((url: string) => {
      const today = new Date().toISOString().slice(0, 10);
      if (url.includes("/pantry")) {
        return Promise.resolve({ items: [{ id: 1 }, { id: 2 }], totalCalories: 142500 });
      }
      if (url.includes("/stats")) {
        return Promise.resolve({
          startDate: "2026-04-07",
          endDate: today,
          dailyCalorieTarget: 2200,
          averageDailyCalories: 2450,
          totalCaloriesConsumed: 10000,
          dailyBreakdown: [{ date: today, caloriesConsumed: 2580 }],
          comparisonToBudget: {
            status: "OVER_BUDGET",
            differenceFromTarget: 250,
            percentageOfTarget: 111,
          },
        });
      }
      if (url.includes("/budget")) {
        return Promise.resolve({
          budgetId: 10,
          householdId: 1,
          dailyCalorieTarget: 2200,
        });
      }
      if (url.includes("/consumption-logs")) {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });
  });

  it("loads pantry, stats, and budget and shows dashboard cards", async () => {
    render(<StatsPage />);

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith("/households/1/pantry");
      expect(getMock).toHaveBeenCalledWith(
        expect.stringMatching(/^\/households\/1\/stats\?startDate=\d{4}-\d{2}-\d{2}&endDate=\d{4}-\d{2}-\d{2}$/),
      );
      expect(getMock).toHaveBeenCalledWith("/households/1/budget");
      expect(getMock).toHaveBeenCalledWith("/households/1/consumption-logs?limit=30");
    });

    await waitFor(() => {
      expect(screen.getByText(/Pantry Overview/i)).toBeInTheDocument();
      expect(screen.getByText(/142,500 kcal/i)).toBeInTheDocument();
      expect(screen.getByText(/2,450 kcal \/ day/i)).toBeInTheDocument();
    });
  });

  it("opens budget modal when owner clicks Edit", async () => {
    render(<StatsPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Edit/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

    await waitFor(() => {
      expect(screen.getByTestId("budget-modal")).toBeInTheDocument();
    });
  });
});
