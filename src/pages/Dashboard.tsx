import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Filter,
  LogOut,
  PieChart as PieChartIcon,
  RefreshCw,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import api from "../api/axios";
import { storage } from "../utils/storage";
import Loader from "../components/common/Loader";

interface DashboardSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
  accountCount: number;
}

interface RecentTransaction {
  id: number;
  type: "income" | "expense" | string;
  amount: number | string;
  category: string;
  description?: string;
  transactionDate?: string;
  createdAt?: string;
}

interface SummaryResponse {
  filters?: {
    startDate: string | null;
    endDate: string | null;
  };
  summary: DashboardSummary;
  recentTransactions: RecentTransaction[];
}

interface CategoryItem {
  category: string;
  total: number;
}

interface ExpenseCategoryResponse {
  filters?: {
    startDate: string | null;
    endDate: string | null;
  };
  totalExpense: number;
  categories: CategoryItem[];
}

interface IncomeCategoryResponse {
  filters?: {
    startDate: string | null;
    endDate: string | null;
  };
  totalIncome: number;
  categories: CategoryItem[];
}

interface ChartPeriod {
  period: string;
  income: number;
  expense: number;
  net: number;
}

type ChartGroupBy =
  | "day"
  | "week"
  | "month"
  | "year";

interface MonthlySummaryResponse {
  filters?: {
    startDate: string | null;
    endDate: string | null;
  };
  groupBy: ChartGroupBy;
  periods: ChartPeriod[];
}

interface AccountItem {
  accountId: number;
  accountName: string;
  accountType: string;
  currency: string;
  balance: number;
  totalIncome: number;
  totalExpense: number;
  net: number;
}

interface AccountsResponse {
  accounts: AccountItem[];
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

function numberValue(
  value: number | string | undefined | null
): number {
  const convertedValue = Number(value ?? 0);

  return Number.isFinite(convertedValue)
    ? convertedValue
    : 0;
}

function formatCurrency(
  value: number | string | undefined | null
): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(numberValue(value));
}

function formatDate(dateValue?: string): string {
  if (!dateValue) {
    return "—";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonth(month: string): string {
  if (!month) {
    return "—";
  }
  

  const date = new Date(`${month}-01T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return month;
  }

  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}


function formatChartPeriod(
  value: string,
  groupBy: ChartGroupBy
): string {
  if (!value) {
    return "—";
  }

  if (groupBy === "day" || groupBy === "week") {
    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    if (groupBy === "week") {
      return `Week of ${date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      })}`;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  }

  if (groupBy === "month") {
    return formatMonth(value);
  }

  return value;
}

function getInputValue(event: unknown): string {
  const input = event as {
    target?: {
      value?: unknown;
    };
  };

  return typeof input.target?.value === "string"
    ? input.target.value
    : "";
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: ApiErrorResponse;
        };
      }
    ).response;

    return (
      response?.data?.message ||
      response?.data?.error ||
      "Unable to load dashboard data."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load dashboard data.";
}


interface DatePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "left" | "right";
}

function dateFromInput(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function DatePicker({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  isOpen: isOpenProp,
  onOpenChange,
  align = "left",
}: DatePickerProps) {
  const selectedDate = dateFromInput(value);
  const today = new Date();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = isOpenProp !== undefined;
  const open = isControlled ? isOpenProp : internalOpen;

  const setOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof next === "function" ? next(open) : next;
    if (!isControlled) {
      setInternalOpen(nextVal);
    }
    onOpenChange?.(nextVal);
  };

  const [calendarMonth, setCalendarMonth] = useState<Date>(
    selectedDate
      ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      : new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const monthLabel = calendarMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1
  ).getDay();

  const daysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0
  ).getDate();

  const calendarCells = Array.from(
    { length: Math.ceil((firstDay + daysInMonth) / 7) * 7 },
    (_, index) => index - firstDay + 1
  );

  const isDisabled = (dateString: string) =>
    Boolean(
      (minDate && dateString < minDate) ||
      (maxDate && dateString > maxDate)
    );

  const handleOpen = () => {
    if (value) {
      const date = dateFromInput(value);
      if (date) {
        setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      }
    }
    setOpen((current) => !current);
  };

  const handleSelect = (dateString: string) => {
    if (isDisabled(dateString)) return;
    onChange(dateString);
    setOpen(false);
  };

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Select date";

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <span
        style={{
          display: "block",
          marginBottom: 8,
          fontSize: 13,
          fontWeight: 700,
          color: "#334155",
        }}
      >
        {label}
      </span>

      <button
        type="button"
        onClick={handleOpen}
        aria-expanded={open}
        style={{
          width: "100%",
          minHeight: 48,
          padding: "0 14px",
          border: open ? "1px solid #3b5bdb" : "1px solid #dbe3ef",
          borderRadius: 12,
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          cursor: "pointer",
          boxSizing: "border-box",
          boxShadow: open
            ? "0 0 0 3px rgba(37, 99, 235, 0.10)"
            : "0 1px 2px rgba(15, 23, 42, 0.04)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#eaedff",
              color: "#3b5bdb",
              flexShrink: 0,
            }}
          >
            <CalendarDays size={18} />
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: value ? 650 : 500,
              color: value ? "#0f172a" : "#94a3b8",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {displayValue}
          </span>
        </span>
        <span
          style={{
            color: "#64748b",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 160ms ease",
            fontSize: 12,
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 50,
            top: "calc(100% + 8px)",
            left: align === "right" ? "auto" : 0,
            right: align === "right" ? 0 : "auto",
            width: "min(330px, calc(100vw - 32px))",
            padding: 16,
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            background: "#ffffff",
            boxShadow:
              "0 20px 45px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.06)",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button
              type="button"
              onClick={() =>
                setCalendarMonth(
                  (current) =>
                    new Date(current.getFullYear(), current.getMonth() - 1, 1)
                )
              }
              aria-label="Previous month"
              style={{ width: 34, height: 34, border: "1px solid #e2e8f0", borderRadius: 9, background: "#ffffff", color: "#334155", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <ChevronLeft size={18} />
            </button>

            <strong style={{ fontSize: 15, color: "#0f172a" }}>{monthLabel}</strong>

            <button
              type="button"
              onClick={() =>
                setCalendarMonth(
                  (current) =>
                    new Date(current.getFullYear(), current.getMonth() + 1, 1)
                )
              }
              aria-label="Next month"
              style={{ width: 34, height: 34, border: "1px solid #e2e8f0", borderRadius: 9, background: "#ffffff", color: "#334155", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <span key={day} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#94a3b8", padding: "5px 0" }}>
                {day}
              </span>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {calendarCells.map((dayNumber, index) => {
              if (dayNumber < 1 || dayNumber > daysInMonth) {
                return <span key={`empty-${index}`} style={{ height: 36 }} />;
              }

              const date = new Date(
                calendarMonth.getFullYear(),
                calendarMonth.getMonth(),
                dayNumber
              );
              const dateString = toInputDate(date);
              const disabled = isDisabled(dateString);
              const selected = dateString === value;
              const currentDay = dateString === toInputDate(today);

              return (
                <button
                  type="button"
                  key={dateString}
                  disabled={disabled}
                  onClick={() => handleSelect(dateString)}
                  style={{
                    height: 36,
                    border:
                      currentDay && !selected
                        ? "1px solid #93c5fd"
                        : "1px solid transparent",
                    borderRadius: 9,
                    background: selected ? "#3b5bdb" : currentDay ? "#eaedff" : "transparent",
                    color: selected ? "#ffffff" : disabled ? "#cbd5e1" : "#334155",
                    fontSize: 13,
                    fontWeight: selected || currentDay ? 700 : 500,
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.7 : 1,
                  }}
                >
                  {dayNumber}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid #e8ecff" }}>
            <button
              type="button"
              onClick={() => {
                const todayString = toInputDate(today);
                if (!isDisabled(todayString)) {
                  onChange(todayString);
                  setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                  setOpen(false);
                }
              }}
              style={{ border: "none", background: "transparent", padding: "6px 0", color: "#3b5bdb", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              disabled={!value}
              style={{ border: "none", background: "transparent", padding: "6px 0", color: value ? "#64748b" : "#cbd5e1", fontSize: 13, fontWeight: 600, cursor: value ? "pointer" : "not-allowed" }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary>({
    totalBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
    transactionCount: 0,
    accountCount: 0,
  });

  const [recentTransactions, setRecentTransactions] =
    useState<RecentTransaction[]>([]);

  const [expenseCategories, setExpenseCategories] =
    useState<CategoryItem[]>([]);

  const [incomeCategories, setIncomeCategories] =
    useState<CategoryItem[]>([]);

 const [monthlySummary, setMonthlySummary] =
  useState<ChartPeriod[]>([]);

const [chartGroupBy, setChartGroupBy] =
  useState<ChartGroupBy>("month");

  const [accounts, setAccounts] =
    useState<AccountItem[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState("");

  const [endDate, setEndDate] = useState("");

  const [showFilterCard, setShowFilterCard] = useState(false);
  const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);

  const [appliedStartDate, setAppliedStartDate] =
    useState("");

  const [appliedEndDate, setAppliedEndDate] =
    useState("");

  const fetchDashboardData = useCallback(
    async (
      filterStartDate = appliedStartDate,
      filterEndDate = appliedEndDate,
      isInitial = false
    ) => {
      try {
        if (isInitial) {
          setLoading(true);
        }
        setError("");

        const params: {
          startDate?: string;
          endDate?: string;
          groupBy?: ChartGroupBy;
        } = {};
        if (filterStartDate) {
          params.startDate = filterStartDate;
        }

        if (filterEndDate) {
          params.endDate = filterEndDate;
        }
        params.groupBy = chartGroupBy;

        const [
          summaryResponse,
          expensesResponse,
          incomeResponse,
          monthlyResponse,
          accountsResponse,
        ] = await Promise.all([
          api.get<SummaryResponse>(
            "/dashboard/summary",
            { params }
          ),

          api.get<ExpenseCategoryResponse>(
            "/dashboard/expenses-by-category",
            { params }
          ),

          api.get<IncomeCategoryResponse>(
            "/dashboard/income-by-category",
            { params }
          ),

          api.get<MonthlySummaryResponse>(
            "/dashboard/monthly-summary",
            { params }
          ),

          api.get<AccountsResponse>(
            "/dashboard/accounts-summary",
            { params }
          ),
        ]);

        const summaryData = summaryResponse.data;
        const expensesData = expensesResponse.data;
        const incomeData = incomeResponse.data;
        const monthlyData = monthlyResponse.data;
        const accountsData = accountsResponse.data;

        setSummary({
          totalBalance: numberValue(
            summaryData.summary?.totalBalance
          ),
          totalIncome: numberValue(
            summaryData.summary?.totalIncome
          ),
          totalExpense: numberValue(
            summaryData.summary?.totalExpense
          ),
          transactionCount: numberValue(
            summaryData.summary?.transactionCount
          ),
          accountCount: numberValue(
            summaryData.summary?.accountCount
          ),
        });

        setRecentTransactions(
          Array.isArray(summaryData.recentTransactions)
            ? summaryData.recentTransactions
            : []
        );

        setExpenseCategories(
          Array.isArray(expensesData.categories)
            ? expensesData.categories
            : []
        );

        setIncomeCategories(
          Array.isArray(incomeData.categories)
            ? incomeData.categories
            : []
        );

        setMonthlySummary(
          Array.isArray(monthlyData.periods)
            ? monthlyData.periods
            : []
        );

        setAccounts(
          Array.isArray(accountsData.accounts)
            ? accountsData.accounts
            : []
        );
      } catch (requestError: unknown) {
        setError(getErrorMessage(requestError));
      } finally {
        if (isInitial) {
          setLoading(false);
        }
      }
    },
    [
      appliedStartDate,
      appliedEndDate,
      chartGroupBy,
    ]
  );

  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      void fetchDashboardData(appliedStartDate, appliedEndDate, true);
    } else {
      void fetchDashboardData(appliedStartDate, appliedEndDate, false);
    }
  }, [fetchDashboardData, appliedStartDate, appliedEndDate]);

  const handleApplyFilter = () => {
    if (startDate && endDate && startDate > endDate) {
      setError("Start date cannot be later than end date.");
      return;
    }

    setError("");
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setShowFilterCard(false);
  };

  const handleClearFilter = () => {
    setStartDate("");
    setEndDate("");
    setAppliedStartDate("");
    setAppliedEndDate("");
    setError("");
    setShowFilterCard(false);
  };

  const applyDateRange = (rangeStart: string, rangeEnd: string) => {
    setStartDate(rangeStart);
    setEndDate(rangeEnd);
    setAppliedStartDate(rangeStart);
    setAppliedEndDate(rangeEnd);
    setError("");
    setShowFilterCard(false);
  };

  const handleTodayFilter = () => {
    const today = new Date();
    const todayString = toInputDate(today);
    applyDateRange(todayString, todayString);
  };

  const handleThisMonthFilter = () => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    applyDateRange(toInputDate(monthStart), toInputDate(today));
  };

  const handleLastMonthFilter = () => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    applyDateRange(toInputDate(monthStart), toInputDate(monthEnd));
  };

  const handleThisYearFilter = () => {
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);
    applyDateRange(toInputDate(yearStart), toInputDate(today));
  };

  const handleRefresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    setError("");

    try {
      await fetchDashboardData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    storage.removeToken();

    navigate("/login", {
      replace: true,
    });
  };

  const netSavings =
    summary.totalIncome - summary.totalExpense;

  const maxExpenseCategoryTotal = Math.max(
    ...expenseCategories.map((item) =>
      numberValue(item.total)
    ),
    1
  );

  const maxIncomeCategoryTotal = Math.max(
    ...incomeCategories.map((item) =>
      numberValue(item.total)
    ),
    1
  );

  const expenseChartData = expenseCategories.map(
    (item) => ({
      name: item.category,
      value: numberValue(item.total),
    })
  );

  const incomeChartData = incomeCategories.map(
    (item) => ({
      name: item.category,
      value: numberValue(item.total),
    })
  );

  const chartData = monthlySummary.map(
  (item) => ({
    period: formatChartPeriod(
      item.period,
      chartGroupBy
    ),
    income: numberValue(item.income),
    expense: numberValue(item.expense),
    net: numberValue(item.net),
  })
);

  const pieColors = [
    "#3b5bdb",
    "#16a34a",
    "#dc2626",
    "#9333ea",
    "#ea580c",
    "#0891b2",
    "#ca8a04",
    "#db2777",
  ];

  const chartStyles = (
    <style>
      {`
        .chart-panel-header {
          align-items: flex-start;
        }

        .chart-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .chart-period-select {
          height: 38px;
          min-width: 110px;
          padding: 0 34px 0 12px;
          border: 1px solid #dbe3ef;
          border-radius: 9px;
          background: #ffffff;
          color: #0f172a;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          outline: none;
        }

        .chart-period-select:focus {
          border-color: #3b5bdb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.10);
        }

        @media (max-width: 640px) {
          .chart-panel-header {
            align-items: flex-start;
            gap: 12px;
          }

          .chart-header-actions {
            flex-shrink: 0;
          }

          .chart-period-select {
            min-width: 95px;
          }
        }
      `}
    </style>
  );

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        {chartStyles}

        {/* HEADER */}
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">
              Finance Management
            </p>

            <h1>
              Dashboard
            </h1>

            <p className="page-subtitle">
              Overview of your financial activity
            </p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className={`header-filter-btn ${appliedStartDate || appliedEndDate ? "active" : ""}`}
              onClick={() => {
                setShowFilterCard((prev) => {
                  if (prev) setOpenPicker(null);
                  return !prev;
                });
              }}
              aria-label="Filter dashboard"
            >
              <Filter size={14} />
              <span>
                {appliedStartDate || appliedEndDate ? "Filter Active" : "Filter"}
              </span>
              {(appliedStartDate || appliedEndDate) && (
                <span className="filter-active-dot" />
              )}
            </button>

            {showFilterCard && (
              <>
                <div
                  className="header-filter-backdrop"
                  onClick={() => {
                    setShowFilterCard(false);
                    setOpenPicker(null);
                  }}
                />
                <div className="header-filter-dropdown">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Filter size={16} color="#3b5bdb" />
                      <strong style={{ fontSize: 14, color: "#0f172a" }}>
                        Filter Dashboard
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFilterCard(false);
                        setOpenPicker(null);
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#94a3b8",
                        cursor: "pointer",
                        padding: 4,
                        display: "flex",
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 12, marginBottom: 14 }}>
                    <DatePicker
                      label="Start Date"
                      value={startDate}
                      onChange={setStartDate}
                      maxDate={endDate || undefined}
                      isOpen={openPicker === "start"}
                      onOpenChange={(isOpen) => setOpenPicker(isOpen ? "start" : null)}
                      align="left"
                    />
                    <DatePicker
                      label="End Date"
                      value={endDate}
                      onChange={setEndDate}
                      minDate={startDate || undefined}
                      isOpen={openPicker === "end"}
                      onOpenChange={(isOpen) => setOpenPicker(isOpen ? "end" : null)}
                      align="right"
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                      marginBottom: 14,
                    }}
                  >
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ fontSize: 11, padding: "6px 10px", minHeight: "auto", borderRadius: 10 }}
                      onClick={() => {
                        setOpenPicker(null);
                        handleTodayFilter();
                      }}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ fontSize: 11, padding: "6px 10px", minHeight: "auto", borderRadius: 10 }}
                      onClick={() => {
                        setOpenPicker(null);
                        handleThisMonthFilter();
                      }}
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ fontSize: 11, padding: "6px 10px", minHeight: "auto", borderRadius: 10 }}
                      onClick={() => {
                        setOpenPicker(null);
                        handleLastMonthFilter();
                      }}
                    >
                      Last Month
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ fontSize: 11, padding: "6px 10px", minHeight: "auto", borderRadius: 10 }}
                      onClick={() => {
                        setOpenPicker(null);
                        handleThisYearFilter();
                      }}
                    >
                      This Year
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      borderTop: "1px solid #e8ecff",
                      paddingTop: 12,
                    }}
                  >
                    <button
                      type="button"
                      className="primary-button"
                      style={{ flex: 1, borderRadius: 12 }}
                      onClick={() => {
                        setOpenPicker(null);
                        handleApplyFilter();
                      }}
                    >
                      Apply Filter
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ borderRadius: 12 }}
                      onClick={() => {
                        setOpenPicker(null);
                        handleClearFilter();
                      }}
                      disabled={!startDate && !endDate && !appliedStartDate && !appliedEndDate}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* ERROR */}
        {error && (
          <div className="error-alert">
            <span>{error}</span>

            <button
              type="button"
              onClick={handleRefresh}
              className="error-button"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <Loader message="Loading dashboard..." fullScreen={false} />
        ) : (
          <>
            {/* STAT CARDS */}
            <section className="stats-grid">

          <div className="stat-card">
            <div className="stat-card-top">
              <p className="stat-label">
                Total Balance
              </p>
              <div className="stat-icon blue-icon">
                <Wallet size={18} />
              </div>
            </div>

            <h2 title={formatCurrency(summary.totalBalance)}>
              {formatCurrency(summary.totalBalance)}
            </h2>

            <p className="stat-description" title="Across all your accounts">
              Across all your accounts
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <p className="stat-label">
                Total Income
              </p>
              <div className="stat-icon green-icon">
                <ArrowUpRight size={18} />
              </div>
            </div>

            <h2 className="income-value" title={formatCurrency(summary.totalIncome)}>
              {formatCurrency(summary.totalIncome)}
            </h2>

            <p className="stat-description" title="Total recorded income">
              Total recorded income
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <p className="stat-label">
                Total Expense
              </p>
              <div className="stat-icon red-icon">
                <ArrowDownRight size={18} />
              </div>
            </div>

            <h2 className="expense-value" title={formatCurrency(summary.totalExpense)}>
              {formatCurrency(summary.totalExpense)}
            </h2>

            <p className="stat-description" title="Total recorded expenses">
              Total recorded expenses
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <p className="stat-label">
                Net Savings
              </p>
              <div className="stat-icon purple-icon">
                <CircleDollarSign size={18} />
              </div>
            </div>

            <h2
              className={netSavings >= 0 ? "savings-value" : "negative-savings-value"}
              title={formatCurrency(netSavings)}
            >
              {formatCurrency(netSavings)}
            </h2>

            <p className="stat-description" title="Income minus expenses">
              Income minus expenses
            </p>
          </div>

        </section>

        {/* INCOME / EXPENSE CHART */}
        <section className="panel">
          <div className="panel-header chart-panel-header">
            <div>
              <h2>Income & Expense</h2>

              <p>
                Compare your financial activity by day,
                week, month, or year
              </p>
            </div>

            <div className="chart-header-actions">
              <select
                value={chartGroupBy}
                onChange={(event) =>
                  setChartGroupBy(
                    getInputValue(event) as ChartGroupBy
                  )
                }
                className="chart-period-select"
                aria-label="Chart period"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>

              <TrendingUp
                size={21}
                className="panel-header-icon"
              />
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="empty-state">
              No chart data available for this period.
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                height: 350,
              }}
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 10,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="period"
                    minTickGap={20}
                  />

                  <YAxis />

                  <Tooltip />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="Expense"
                    stroke="#dc2626"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net"
                    stroke="#3b5bdb"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* CATEGORY CHARTS */}
        <section className="content-grid">

          {/* EXPENSE CATEGORY */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>
                  Expense by Category
                </h2>

                <p>
                  Breakdown of your spending
                </p>
              </div>

              <BarChart3
                size={21}
                className="panel-header-icon"
              />
            </div>

            {expenseCategories.length === 0 ? (
              <div className="empty-state">
                No expense category data
                available.
              </div>
            ) : (
              <>
                <div
                  style={{
                    width: "100%",
                    height: 280,
                    marginBottom: 20,
                  }}
                >
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <PieChart>
                      <Pie
                        data={expenseChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={95}
                        label
                      >
                        {expenseChartData.map(
                          (_, index) => (
                            <Cell
                              key={`expense-${index}`}
                              fill={
                                pieColors[
                                  index %
                                    pieColors.length
                                ]
                              }
                            />
                          )
                        )}
                      </Pie>

                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="category-list">
                  {expenseCategories.map(
                    (item, index) => {
                      const total =
                        numberValue(item.total);

                      const percentage =
                        (total /
                          maxExpenseCategoryTotal) *
                        100;

                      return (
                        <div
                          className="category-item"
                          key={`${item.category}-${index}`}
                        >
                          <div className="category-row">
                            <span>
                              {item.category}
                            </span>

                            <strong>
                              {formatCurrency(total)}
                            </strong>
                          </div>

                          <div className="progress-background">
                            <div
                              className="progress-bar"
                              style={{
                                width: `${Math.min(
                                  percentage,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </>
            )}
          </div>

          {/* INCOME CATEGORY */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>
                  Income by Category
                </h2>

                <p>
                  Breakdown of your income
                </p>
              </div>

              <PieChartIcon
                size={21}
                className="panel-header-icon"
              />
            </div>

            {incomeCategories.length === 0 ? (
              <div className="empty-state">
                No income category data
                available.
              </div>
            ) : (
              <>
                <div
                  style={{
                    width: "100%",
                    height: 280,
                    marginBottom: 20,
                  }}
                >
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={incomeChartData}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="name"
                        angle={-25}
                        textAnchor="end"
                        height={70}
                      />

                      <YAxis />

                      <Tooltip />

                      <Bar
                        dataKey="value"
                        name="Income"
                        fill="#16a34a"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="category-list">
                  {incomeCategories.map(
                    (item, index) => {
                      const total =
                        numberValue(item.total);

                      const percentage =
                        (total /
                          maxIncomeCategoryTotal) *
                        100;

                      return (
                        <div
                          className="category-item"
                          key={`${item.category}-${index}`}
                        >
                          <div className="category-row">
                            <span>
                              {item.category}
                            </span>

                            <strong>
                              {formatCurrency(total)}
                            </strong>
                          </div>

                          <div className="progress-background">
                            <div
                              className="progress-bar"
                              style={{
                                width: `${Math.min(
                                  percentage,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ACCOUNTS */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>
                Accounts
              </h2>

              <p>
                Current account balances
              </p>
            </div>

            <Wallet
              size={21}
              className="panel-header-icon"
            />
          </div>

          {accounts.length === 0 ? (
            <div className="empty-state">
              No accounts available.
            </div>
          ) : (
            <div className="account-list">
              {accounts.map((account) => (
                <div
                  className="account-item"
                  key={account.accountId}
                  onClick={() => navigate("/accounts")}
                  onKeyDown={(event) => {
                    const keyboardEvent =
                      event as unknown as {
                        key?: string;
                      };

                    if (
                      keyboardEvent.key === "Enter" ||
                      keyboardEvent.key === " "
                    ) {
                      navigate("/accounts");
                    }
                  }}
                  tabIndex={0}
                  title="Open Accounts"
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <div className="account-information">
                    <div className="account-icon">
                      <Wallet size={18} />
                    </div>

                    <div>
                      <h3>
                        {account.accountName}
                      </h3>

                      <p>
                        {account.accountType}
                      </p>
                    </div>
                  </div>

                  <strong>
                    {formatCurrency(
                      account.balance
                    )}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RECENT TRANSACTIONS */}
        <section className="panel transactions-panel">
          <div className="panel-header">
            <div>
              <h2>
                Recent Transactions
              </h2>

              <p>
                Your latest financial activities
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div className="transaction-count">
                <Activity size={17} />

                <span>
                  {summary.transactionCount}{" "}
                  transactions
                </span>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate("/transactions")}
              >
                View All
              </button>
            </div>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="empty-state">
              No recent transactions
              available.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>
                      Description
                    </th>

                    <th>
                      Category
                    </th>

                    <th>
                      Date
                    </th>

                    <th className="amount-column">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {recentTransactions.map(
                    (transaction) => {
                      const isIncome =
                        transaction.type ===
                        "income";

                      const amount =
                        numberValue(
                          transaction.amount
                        );

                      return (
                        <tr
                          key={transaction.id}
                          onClick={() =>
                            navigate("/transactions")
                          }
                          onKeyDown={(event) => {
                            const keyboardEvent =
                              event as unknown as {
                                key?: string;
                              };

                            if (
                              keyboardEvent.key ===
                                "Enter" ||
                              keyboardEvent.key ===
                                " "
                            ) {
                              navigate("/transactions");
                            }
                          }}
                          tabIndex={0}
                          title="Open Transactions"
                          style={{
                            cursor: "pointer",
                          }}
                        >
                          <td>
                            <div className="transaction-description">
                              <div
                                className={
                                  isIncome
                                    ? "transaction-icon income-transaction"
                                    : "transaction-icon expense-transaction"
                                }
                              >
                                {isIncome ? (
                                  <ArrowUpRight
                                    size={17}
                                  />
                                ) : (
                                  <ArrowDownRight
                                    size={17}
                                  />
                                )}
                              </div>

                              <span>
                                {transaction.description ||
                                  "Transaction"}
                              </span>
                            </div>
                          </td>

                          <td>
                            {transaction.category ||
                              "—"}
                          </td>

                          <td>
                            {formatDate(
                              transaction.transactionDate ||
                                transaction.createdAt
                            )}
                          </td>

                          <td
                            className={
                              isIncome
                                ? "amount-column income-text"
                                : "amount-column expense-text"
                            }
                          >
                            {isIncome ? "+" : "-"}

                            {formatCurrency(amount)}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
          </>
        )}

      </div>
    </main>
  );
}

export default Dashboard;
  