/* eslint-disable @typescript-eslint/no-explicit-any, react/display-name */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import StatsPage from "@/stats/page";

const pushMock = jest.fn();
const getMock = jest.fn();
const messageMock = {
  warning: jest.fn(),
  error: jest.fn(),
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({ get: getMock }),
}));

jest.mock("@/hooks/useLocalStorage", () => ({
  __esModule: true,
  default: (key: string) => {
    if (key === "selectedHouseholdId") {
      return { value: 1, set: jest.fn(), clear: jest.fn() };
    }
    return { value: null, set: jest.fn(), clear: jest.fn() };
  },
}));

jest.mock("antd", () => {
  const Button = ({ children, onClick, loading }: any) => (
    <button onClick={onClick} data-loading={loading ? "true" : "false"}>
      {children}
    </button>
  );
  const Card = ({ children, title }: any) => (
    <div>
      {title ? <div>{title}</div> : null}
      <div>{children}</div>
    </div>
  );
  const Space = ({ children }: any) => <div>{children}</div>;
  const Spin = () => <div>Loading...</div>;
  const Empty = ({ description }: any) => <div>{description}</div>;
  const Tag = ({ children }: any) => <span>{children}</span>;
  const Table = ({ dataSource }: any) => (
    <table>
      <tbody>
        {dataSource.map((row: any) => (
          <tr key={row.date}>
            <td>{row.date}</td>
            <td>{row.caloriesConsumed.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  const DatePicker = ({ onChange, placeholder }: any) => (
    <input
      aria-label={placeholder}
      onChange={() => onChange({ format: () => "2026-04-10" })}
    />
  );
  const Typography = {
    Title: ({ children }: any) => <h1>{children}</h1>,
    Paragraph: ({ children }: any) => <p>{children}</p>,
    Text: ({ children }: any) => <span>{children}</span>,
  };
  const App = {
    useApp: () => ({ message: messageMock }),
  };

  return { Button, Card, Space, Spin, Empty, Tag, Table, DatePicker, Typography, App };
});

describe("StatsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads and renders household stats", async () => {
    getMock.mockResolvedValueOnce({
      startDate: "2026-04-10",
      endDate: "2026-04-10",
      dailyCalorieTarget: 2000,
      averageDailyCalories: 1800,
      totalCaloriesConsumed: 1800,
      dailyBreakdown: [{ date: "2026-04-10", caloriesConsumed: 1800 }],
      comparisonToBudget: {
        status: "UNDER_BUDGET",
        differenceFromTarget: -200,
        percentageOfTarget: 90,
      },
    });

    render(<StatsPage />);

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith(
        "/households/1/stats?startDate=2026-04-07&endDate=2026-04-13",
      );
    });
  });

  it("renders stats after clicking load button", async () => {
    getMock.mockResolvedValue({
      startDate: "2026-04-10",
      endDate: "2026-04-10",
      dailyCalorieTarget: 2000,
      averageDailyCalories: 1800,
      totalCaloriesConsumed: 1800,
      dailyBreakdown: [{ date: "2026-04-10", caloriesConsumed: 1800 }],
      comparisonToBudget: {
        status: "UNDER_BUDGET",
        differenceFromTarget: -200,
        percentageOfTarget: 90,
      },
    });

    render(<StatsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Load stats" }));

    await waitFor(() => {
      expect(screen.getByText("UNDER_BUDGET")).toBeInTheDocument();
      expect(screen.getByText("2026-04-10")).toBeInTheDocument();
    });
  });
});