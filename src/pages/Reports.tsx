import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  PieChart as PieChartIcon,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import Loader from "../components/common/Loader";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { storage } from "../utils/storage";

type CategoryItem = {
  category: string;
  total: number | string;
};

type MonthlyItem = {
  month: string;
  income: number | string;
  expense: number | string;
  net: number | string;
};

type AccountItem = {
  accountId: number;
  accountName: string;
  accountType: string;
  currency: string;
  balance: number | string;
  totalIncome: number | string;
  totalExpense: number | string;
  net: number | string;
};

type Summary = {
  totalBalance: number | string;
  totalIncome: number | string;
  totalExpense: number | string;
  transactionCount: number | string;
  accountCount: number | string;
};

type SummaryResponse = {
  summary?: Partial<Summary>;
};

type CategoryResponse = {
  categories?: CategoryItem[];
};

type MonthlyResponse = {
  months?: MonthlyItem[];
};

type AccountsResponse = {
  accounts?: AccountItem[];
};

const colors = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

const num = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const money = (value: unknown): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num(value));

const inputDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
};

const monthLabel = (value: string): string => {
  const date = new Date(`${value}-01T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      });
};

const errorMessage = (error: unknown): string => {
  const e = error as {
    response?: {
      data?: {
        message?: string;
        error?: string;
      };
    };
    message?: string;
  };

  return (
    e.response?.data?.message ||
    e.response?.data?.error ||
    e.message ||
    "Unable to load reports."
  );
};

const css = `
.reports-page{width:100%;max-width:1440px;margin:0 auto;padding:32px 28px 48px;box-sizing:border-box}
.reports-back{display:inline-flex;gap:6px;color:#475569;font-size:12px;text-decoration:none;margin-bottom:18px}.reports-back:hover{color:#4f46e5}
.reports-header{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:24px 28px;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;box-shadow:0 4px 20px rgba(37,99,235,0.04),0 1px 3px rgba(15,23,42,0.02);margin-bottom:24px;position:relative}
.reports-eyebrow{display:inline-flex;align-items:center;gap:6px;margin:0 0 8px;padding:4px 11px;border-radius:999px;background:#eaedff;border:1px solid #c5ccf5;color:#3b5bdb;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;line-height:1}
.reports-title{margin:0;color:#0f172a;font-size:clamp(24px,2.2vw,32px);line-height:1.2;font-weight:800;letter-spacing:-0.025em}
.reports-subtitle{margin:6px 0 0;color:#64748b;font-size:14px;font-weight:500;line-height:1.4}
.reports-actions{display:flex;align-items:center;gap:10px;position:relative}
.reports-btn{min-height:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;border-radius:12px;border:1px solid #dbe3ef;background:#fff;color:#334155;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 1px 2px rgba(15,23,42,0.04);transition:all 0.2s cubic-bezier(0.4,0,0.2,1);white-space:nowrap}
.reports-btn:hover{border-color:#cbd5e1;color:#1e293b;background:#f8fafc;transform:translateY(-1px);box-shadow:0 4px 12px rgba(15,23,42,0.06)}
.reports-btn.primary{border-color:#3b5bdb;background:#3b5bdb;color:#fff;box-shadow:0 1px 3px rgba(37,99,235,0.15)}
.reports-btn.primary:hover{background:#2f4ac2;box-shadow:0 4px 12px rgba(37,99,235,0.22)}
.reports-btn:disabled{opacity:.6;cursor:not-allowed}
.reports-filter,.reports-panel,.reports-stat{background:#fff;border:1px solid rgba(255,255,255,0.9);border-radius:16px;box-shadow:0 2px 12px rgba(59,91,219,0.08),0 0 0 1px rgba(186, 215, 245,0.5)}.reports-filter{padding:20px;margin-bottom:24px}.reports-filter-title{display:flex;align-items:center;gap:8px;color:#0f172a;font-size:14px;font-weight:800;margin-bottom:14px}.reports-filter-grid{display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end}.reports-field label{display:block;margin-bottom:6px;color:#64748b;font-size:12px;font-weight:700}.reports-field input{width:100%;height:44px;box-sizing:border-box;padding:0 12px;border:1px solid #cbd5e1;border-radius:12px;outline:none;color:#0f172a;background:#fff;font-size:13px}.reports-field input:focus{border-color:#3b5bdb;box-shadow:0 0 0 3px rgba(51,84,244,.12)}.reports-filter-actions{display:flex;gap:8px}.reports-quick{margin-top:12px;display:flex;flex-wrap:wrap;gap:7px}.reports-quick button{border:1px solid #e0e5f8;background:#f8fafc;color:#475569;border-radius:9px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer}.reports-quick button:hover{border-color:#c7d4fe;color:#3b5bdb;background:#eaedff}
.reports-error{margin:0 0 20px;padding:12px 16px;border:1px solid #fecaca;border-radius:12px;background:#fef2f2;color:#b91c1c;font-size:13px}.reports-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:24px}.reports-stat{padding:22px 24px;min-height:128px;display:flex;flex-direction:column;justify-content:space-between;transition:box-shadow 0.2s ease,transform 0.2s ease}.reports-stat:hover{transform:translateY(-1px);box-shadow:0 6px 24px rgba(59,91,219,0.13),0 0 0 1px rgba(160, 205, 245,0.7)}.reports-stat-top{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%}.reports-label{color:#64748b;font-size:14px;font-weight:600;line-height:1.3;flex:1;min-width:0}.reports-value{margin-top:12px;color:#0f172a;font-size:clamp(20px,1.8vw,26px);line-height:1.2;font-weight:800;letter-spacing:-0.02em;width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.reports-value.income{color:#059669}.reports-value.expense{color:#dc2626}.reports-value.savings{color:#3b5bdb}.reports-meta{margin-top:10px;color:#94a3b8;font-size:13px;font-weight:500;line-height:1.4;width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.reports-icon{width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;border-radius:11px;background:#eaedff;color:#3b5bdb}.reports-icon.income{background:#ecfdf5;color:#059669}.reports-icon.expense{background:#fef2f2;color:#dc2626}.reports-icon.balance{background:#eaedff;color:#3b5bdb}
.reports-grid{display:grid;grid-template-columns:1.35fr .9fr;gap:20px;margin-bottom:20px}.reports-grid.equal{grid-template-columns:repeat(2,minmax(0,1fr))}.reports-panel{min-width:0;padding:24px;margin-bottom:20px}.reports-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}.reports-panel-title{margin:0;color:#0f172a;font-size:16px;font-weight:800}.reports-panel-subtitle{margin:5px 0 0;color:#64748b;font-size:12px}.reports-chart{width:100%;height:310px}.reports-chart.small{height:280px}.reports-empty,.reports-loading{min-height:220px;display:grid;place-items:center;color:#94a3b8;font-size:13px}.reports-loading{min-height:320px}.reports-table-wrap{width:100%;overflow-x:auto}.reports-table{width:100%;border-collapse:collapse;font-size:13px}.reports-table th{padding:12px 14px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:11px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;text-align:left;white-space:nowrap}.reports-table td{padding:14px 14px;border-bottom:1px solid #e8ecff;color:#334155;white-space:nowrap}.reports-table tr:last-child td{border-bottom:0}.account-name{color:#0f172a;font-weight:750}.account-type{margin-top:3px;color:#94a3b8;font-size:11px;text-transform:uppercase}.positive{color:#059669!important;font-weight:750}.negative{color:#dc2626!important;font-weight:750}.neutral{color:#3b5bdb!important;font-weight:750}.reports-note{margin-top:16px;color:#94a3b8;font-size:11px}
@media(max-width:1100px){.reports-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.reports-grid{grid-template-columns:1fr}}

@page{size:landscape;margin:10mm}
@media print{
  html,body{background:#fff!important}
  body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
  .reports-page{max-width:none;width:100%;padding:0!important;margin:0!important;background:#fff!important}
  .reports-back,.reports-actions,.reports-filter,.reports-quick,.reports-error{display:none!important}
  .reports-header{display:block;margin:0 0 12px!important;padding:0!important}
  .reports-eyebrow{font-size:9px!important;margin-bottom:3px!important}
  .reports-title{font-size:24px!important}
  .reports-subtitle{font-size:10px!important;margin-top:4px!important}
  .reports-print-period{display:block!important;margin-top:5px;color:#64748b;font-size:10px}
  .reports-summary{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important;margin-bottom:10px!important}
  .reports-stat{padding:10px!important;border:1px solid #dbe3ef!important;box-shadow:none!important;break-inside:avoid;page-break-inside:avoid}
  .reports-value{font-size:17px!important;margin-top:4px!important}
  .reports-label{font-size:9px!important}
  .reports-meta{font-size:8px!important}
  .reports-icon{width:28px!important;height:28px!important;flex-basis:28px!important}
  .reports-grid{grid-template-columns:1.35fr .9fr!important;gap:10px!important;margin-bottom:10px!important}
  .reports-grid.equal{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}
  .reports-panel{padding:10px!important;margin-bottom:10px!important;border:1px solid #dbe3ef!important;box-shadow:none!important;break-inside:avoid;page-break-inside:avoid}
  .reports-panel-head{margin-bottom:6px!important}
  .reports-panel-title{font-size:11px!important}
  .reports-panel-subtitle{font-size:8px!important;margin-top:2px!important}
  .reports-chart{height:220px!important}
  .reports-chart.small{height:200px!important}
  .reports-table{font-size:9px!important}
  .reports-table th{padding:6px 5px!important;font-size:8px!important}
  .reports-table td{padding:7px 5px!important}
  .reports-note{font-size:8px!important;margin-top:7px!important}
}
.reports-print-period{display:none}
@media(max-width:760px){.reports-page{padding:22px 16px 36px}.reports-header{align-items:flex-start;flex-direction:column}.reports-actions{width:100%}.reports-actions .reports-btn{flex:1}.reports-filter-grid,.reports-summary,.reports-grid.equal{grid-template-columns:1fr}.reports-filter-actions .reports-btn{flex:1}.reports-title{font-size:28px}.reports-chart,.reports-chart.small{height:260px}}
`;

const inputValue = (event: unknown): string => {
  const input = event as {
    currentTarget?: {
      value?: string;
    };
  };

  return input.currentTarget?.value ?? "";
};


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

  const monthLabel = calendarMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const calendarCells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => index - firstDay + 1);
  const isDisabled = (dateString: string) => Boolean((minDate && dateString < minDate) || (maxDate && dateString > maxDate));

  const handleOpen = () => {
    if (value) {
      const date = dateFromInput(value);
      if (date) setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    setOpen((current) => !current);
  };

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "Select date";

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <span style={{ display: "block", marginBottom: 6, fontSize: 10, fontWeight: 700, color: "#475569" }}>{label}</span>
      <button type="button" onClick={handleOpen} aria-expanded={open} style={{ width: "100%", minHeight: 44, padding: "0 12px", border: open ? "1px solid #3b5bdb" : "1px solid #cbd5e1", borderRadius: 12, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: "pointer", boxSizing: "border-box", boxShadow: open ? "0 0 0 3px rgba(37,99,235,.10)" : "none" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ width: 28, height: 28, borderRadius: 7, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#eaedff", color: "#3b5bdb", flexShrink: 0 }}><CalendarDays size={15} /></span>
          <span style={{ fontSize: 12, fontWeight: value ? 600 : 500, color: value ? "#0f172a" : "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayValue}</span>
        </span>
        <span style={{ color: "#64748b", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 160ms ease", fontSize: 11 }}>▾</span>
      </button>

      {open && (
        <div style={{ position: "absolute", zIndex: 100, top: "calc(100% + 8px)", left: align === "right" ? "auto" : 0, right: align === "right" ? 0 : "auto", width: "min(330px, calc(100vw - 32px))", padding: 16, border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff", boxShadow: "0 20px 45px rgba(15,23,42,.16), 0 4px 12px rgba(15,23,42,.06)", boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button type="button" onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} aria-label="Previous month" style={{ width: 34, height: 34, border: "1px solid #e2e8f0", borderRadius: 9, background: "#fff", color: "#334155", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ChevronLeft size={18} /></button>
            <strong style={{ fontSize: 15, color: "#0f172a" }}>{monthLabel}</strong>
            <button type="button" onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} aria-label="Next month" style={{ width: 34, height: 34, border: "1px solid #e2e8f0", borderRadius: 9, background: "#fff", color: "#334155", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ChevronRight size={18} /></button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 6 }}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#94a3b8", padding: "5px 0" }}>{day}</span>)}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
            {calendarCells.map((dayNumber, index) => {
              if (dayNumber < 1 || dayNumber > daysInMonth) return <span key={`empty-${index}`} style={{ height: 36 }} />;
              const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), dayNumber);
              const dateString = toInputDate(date);
              const disabled = isDisabled(dateString);
              const selected = dateString === value;
              const currentDay = dateString === toInputDate(today);
              return <button type="button" key={dateString} disabled={disabled} onClick={() => { if (!disabled) { onChange(dateString); setOpen(false); } }} style={{ height: 36, border: currentDay && !selected ? "1px solid #93c5fd" : "1px solid transparent", borderRadius: 9, background: selected ? "#3b5bdb" : currentDay ? "#eaedff" : "transparent", color: selected ? "#fff" : disabled ? "#cbd5e1" : "#334155", fontSize: 13, fontWeight: selected || currentDay ? 700 : 500, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .7 : 1 }}>{dayNumber}</button>;
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid #e8ecff" }}>
            <button type="button" onClick={() => { const todayString = toInputDate(today); if (!isDisabled(todayString)) { onChange(todayString); setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setOpen(false); } }} style={{ border: "none", background: "transparent", padding: "6px 0", color: "#3b5bdb", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Today</button>
            <button type="button" onClick={() => { onChange(""); setOpen(false); }} disabled={!value} style={{ border: "none", background: "transparent", padding: "6px 0", color: value ? "#64748b" : "#cbd5e1", fontSize: 13, fontWeight: 600, cursor: value ? "pointer" : "not-allowed" }}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Reports() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState<Summary>({
    totalBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
    transactionCount: 0,
    accountCount: 0,
  });

  const [expenses, setExpenses] = useState<CategoryItem[]>([]);
  const [income, setIncome] = useState<CategoryItem[]>([]);
  const [months, setMonths] = useState<MonthlyItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");
  const [showFilterCard, setShowFilterCard] = useState(false);
  const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (
      start = appliedStart,
      end = appliedEnd,
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
        } = {};

        if (start) {
          params.startDate = start;
        }

        if (end) {
          params.endDate = end;
        }

        const [
          summaryResponse,
          expensesResponse,
          incomeResponse,
          monthlyResponse,
          accountsResponse,
        ] = await Promise.all([
          api.get<SummaryResponse>("/dashboard/summary", { params }),
          api.get<CategoryResponse>(
            "/dashboard/expenses-by-category",
            { params }
          ),
          api.get<CategoryResponse>(
            "/dashboard/income-by-category",
            { params }
          ),
          api.get<MonthlyResponse>(
            "/dashboard/monthly-summary",
            { params }
          ),
          api.get<AccountsResponse>(
            "/dashboard/accounts-summary",
            { params }
          ),
        ]);

        setSummary({
          totalBalance: num(
            summaryResponse.data.summary?.totalBalance
          ),
          totalIncome: num(
            summaryResponse.data.summary?.totalIncome
          ),
          totalExpense: num(
            summaryResponse.data.summary?.totalExpense
          ),
          transactionCount: num(
            summaryResponse.data.summary?.transactionCount
          ),
          accountCount: num(
            summaryResponse.data.summary?.accountCount
          ),
        });

        setExpenses(
          Array.isArray(expensesResponse.data.categories)
            ? expensesResponse.data.categories
            : []
        );

        setIncome(
          Array.isArray(incomeResponse.data.categories)
            ? incomeResponse.data.categories
            : []
        );

        setMonths(
          Array.isArray(monthlyResponse.data.months)
            ? monthlyResponse.data.months
            : []
        );

        setAccounts(
          Array.isArray(accountsResponse.data.accounts)
            ? accountsResponse.data.accounts
            : []
        );
      } catch (err: unknown) {
        const status = (
          err as {
            response?: {
              status?: number;
            };
          }
        ).response?.status;

        if (status === 401) {
          storage.removeToken();
          navigate("/login", { replace: true });
          return;
        }

        setError(errorMessage(err));
      } finally {
        if (isInitial) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    [appliedStart, appliedEnd, navigate]
  );

  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      void load(appliedStart, appliedEnd, true);
    } else {
      void load(appliedStart, appliedEnd, false);
    }
  }, [load, appliedStart, appliedEnd]);

  const apply = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setAppliedStart(start);
    setAppliedEnd(end);
    setError("");
    setShowFilterCard(false);
  };

  const today = new Date();

  const thisMonth = () => {
    apply(
      inputDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      inputDate(today)
    );
  };

  const lastMonth = () => {
    apply(
      inputDate(
        new Date(today.getFullYear(), today.getMonth() - 1, 1)
      ),
      inputDate(
        new Date(today.getFullYear(), today.getMonth(), 0)
      )
    );
  };

  const thisYear = () => {
    apply(
      inputDate(new Date(today.getFullYear(), 0, 1)),
      inputDate(today)
    );
  };

  const handleApply = () => {
    if (
      startDate &&
      endDate &&
      startDate > endDate
    ) {
      setError("Start date cannot be later than end date.");
      return;
    }

    apply(startDate, endDate);
  };

  const clear = () => {
    apply("", "");
  };

  const refresh = () => {
    setRefreshing(true);
    void load();
  };

  const print = () => {
    const browser = globalThis as unknown as {
      print?: () => void;
    };

    browser.print?.();
  };

  const exportCsv = () => {
    const csvCell = (value: unknown): string => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows: string[][] = [
      ["Finance Management Report"],
      [
        "Report Period",
        appliedStart || "All Time",
        appliedEnd || "",
      ],
      [],
      ["Summary"],
      ["Metric", "Amount"],
      ["Total Income", money(summary.totalIncome)],
      ["Total Expense", money(summary.totalExpense)],
      ["Net Savings", money(savings)],
      ["Current Balance", money(summary.totalBalance)],
      ["Transaction Count", String(num(summary.transactionCount))],
      ["Account Count", String(num(summary.accountCount))],
      [],
      ["Expense by Category"],
      ["Category", "Total"],
      ...expenses.map((item) => [
        item.category || "Uncategorized",
        money(item.total),
      ]),
      [],
      ["Income by Category"],
      ["Category", "Total"],
      ...income.map((item) => [
        item.category || "Uncategorized",
        money(item.total),
      ]),
      [],
      ["Monthly Summary"],
      ["Month", "Income", "Expense", "Net Savings"],
      ...monthly.map((item) => [
        item.month,
        money(item.income),
        money(item.expense),
        money(item.net),
      ]),
      [],
      ["Account Performance"],
      [
        "Account",
        "Type",
        "Currency",
        "Balance",
        "Income",
        "Expense",
        "Net",
      ],
      ...accounts.map((account) => [
        account.accountName,
        account.accountType,
        account.currency,
        money(account.balance),
        money(account.totalIncome),
        money(account.totalExpense),
        money(account.net),
      ]),
    ];

    const csv = rows
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");

    const browser = globalThis as unknown as {
      document?: {
        createElement?: (tagName: string) => {
          href: string;
          download: string;
          click: () => void;
        };
      };
    };

    const anchor = browser.document?.createElement?.("a");

    if (!anchor) {
      setError("CSV export is not available in this browser.");
      return;
    }

    const period =
      appliedStart && appliedEnd
        ? `${appliedStart}_to_${appliedEnd}`
        : "all-time";

    anchor.href =
      `data:text/csv;charset=utf-8,%EF%BB%BF${encodeURIComponent(csv)}`;
    anchor.download = `finance-report-${period}.csv`;
    anchor.click();
  };

  const monthly = useMemo(
    () =>
      months.map((item) => ({
        month: monthLabel(item.month),
        income: num(item.income),
        expense: num(item.expense),
        net: num(item.net),
      })),
    [months]
  );

  const expenseData = useMemo(
    () =>
      expenses.map((item) => ({
        name: item.category || "Uncategorized",
        value: num(item.total),
      })),
    [expenses]
  );

  const incomeData = useMemo(
    () =>
      income.map((item) => ({
        name: item.category || "Uncategorized",
        value: num(item.total),
      })),
    [income]
  );

  const savings =
    num(summary.totalIncome) -
    num(summary.totalExpense);

  return (
    <>
      <style>{css}</style>

      <div className="reports-page">
        <header className="reports-header">
          <div>
            <p className="reports-eyebrow">
              Finance Management
            </p>

            <h1 className="reports-title">
              Reports &amp; Analytics
            </h1>

            <p className="reports-subtitle">
              Understand your income, expenses, savings
              and account performance.
            </p>

            <div className="reports-print-period">
              Report Period: {appliedStart || "All Time"}
              {appliedEnd ? ` → ${appliedEnd}` : ""}
            </div>
          </div>

          <div className="reports-actions" style={{ position: "relative" }}>
            <button
              className={`reports-btn ${appliedStart || appliedEnd ? "primary" : ""}`}
              type="button"
              onClick={() => {
                setShowFilterCard((prev) => {
                  if (prev) setOpenPicker(null);
                  return !prev;
                });
              }}
            >
              <CalendarDays size={14} />
              {appliedStart || appliedEnd ? "Period Active" : "Filter Period"}
            </button>

            <button
              className="reports-btn"
              type="button"
              onClick={refresh}
              disabled={refreshing}
            >
              <RefreshCw size={14} />
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <button
              className="reports-btn"
              type="button"
              onClick={exportCsv}
            >
              <Download size={14} />
              Export CSV
            </button>

            <button
              className="reports-btn"
              type="button"
              onClick={print}
            >
              <Download size={14} />
              Print / PDF
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
                <div
                  className="header-filter-dropdown"
                  style={{ width: "min(360px, calc(100vw - 32px))" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <CalendarDays size={16} color="#3b5bdb" />
                      <strong style={{ fontSize: 14, color: "#0f172a" }}>
                        Filter Report Period
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
                      className="reports-btn"
                      style={{ fontSize: 11, padding: "6px 10px", minHeight: "auto", borderRadius: 10 }}
                      onClick={() => {
                        setOpenPicker(null);
                        const date = inputDate(new Date());
                        apply(date, date);
                      }}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      className="reports-btn"
                      style={{ fontSize: 11, padding: "6px 10px", minHeight: "auto", borderRadius: 10 }}
                      onClick={() => {
                        setOpenPicker(null);
                        thisMonth();
                      }}
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      className="reports-btn"
                      style={{ fontSize: 11, padding: "6px 10px", minHeight: "auto", borderRadius: 10 }}
                      onClick={() => {
                        setOpenPicker(null);
                        lastMonth();
                      }}
                    >
                      Last Month
                    </button>
                    <button
                      type="button"
                      className="reports-btn"
                      style={{ fontSize: 11, padding: "6px 10px", minHeight: "auto", borderRadius: 10 }}
                      onClick={() => {
                        setOpenPicker(null);
                        thisYear();
                      }}
                    >
                      This Year
                    </button>
                    <button
                      type="button"
                      className="reports-btn"
                      style={{ fontSize: 11, padding: "6px 10px", minHeight: "auto", borderRadius: 10 }}
                      onClick={() => {
                        setOpenPicker(null);
                        clear();
                      }}
                    >
                      All Time
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
                      className="reports-btn primary"
                      style={{ flex: 1, borderRadius: 12 }}
                      type="button"
                      onClick={() => {
                        setOpenPicker(null);
                        handleApply();
                      }}
                    >
                      Apply
                    </button>
                    <button
                      className="reports-btn"
                      style={{ borderRadius: 12 }}
                      type="button"
                      onClick={() => {
                        setOpenPicker(null);
                        clear();
                      }}
                      disabled={!startDate && !endDate && !appliedStart && !appliedEnd}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {error && (
          <div className="reports-error">
            {error}
          </div>
        )}

        {loading ? (
          <Loader message="Loading reports..." fullScreen={false} />
        ) : (
          <>
            <section className="reports-summary">
          <article className="reports-stat">
            <div className="reports-stat-top">
              <div className="reports-label">
                Total Income
              </div>
              <div className="reports-icon income">
                <TrendingUp size={18} />
              </div>
            </div>

            <div className="reports-value income">
              {money(summary.totalIncome)}
            </div>

            <div className="reports-meta">
              {num(summary.transactionCount)} transactions
            </div>
          </article>

          <article className="reports-stat">
            <div className="reports-stat-top">
              <div className="reports-label">
                Total Expense
              </div>
              <div className="reports-icon expense">
                <TrendingDown size={18} />
              </div>
            </div>

            <div className="reports-value expense">
              {money(summary.totalExpense)}
            </div>

            <div className="reports-meta">
              Recorded expenses
            </div>
          </article>

          <article className="reports-stat">
            <div className="reports-stat-top">
              <div className="reports-label">
                Net Savings
              </div>
              <div className="reports-icon">
                <BarChart3 size={18} />
              </div>
            </div>

            <div className="reports-value savings">
              {money(savings)}
            </div>

            <div className="reports-meta">
              Income minus expenses
            </div>
          </article>

          <article className="reports-stat">
            <div className="reports-stat-top">
              <div className="reports-label">
                Current Balance
              </div>
              <div className="reports-icon balance">
                <WalletCards size={18} />
              </div>
            </div>

            <div className="reports-value">
              {money(summary.totalBalance)}
            </div>

            <div className="reports-meta">
              {num(summary.accountCount)} accounts
            </div>
          </article>
        </section>

        <section className="reports-grid">
          <article className="reports-panel">
            <div className="reports-panel-head">
              <div>
                <h2 className="reports-panel-title">
                  Income vs Expense
                </h2>

                <p className="reports-panel-subtitle">
                  Monthly cash-flow comparison.
                </p>
              </div>
            </div>

            {monthly.length ? (
              <div className="reports-chart">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart data={monthly}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e0e4f5"
                    />

                    <XAxis
                      dataKey="month"
                      tick={{
                        fontSize: 10,
                        fill: "#64748b",
                      }}
                    />

                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "#64748b",
                      }}
                    />

                    <Tooltip
                      formatter={(value) =>
                        money(value)
                      }
                    />

                    <Legend
                      wrapperStyle={{
                        fontSize: 11,
                      }}
                    />

                    <Bar
                      dataKey="income"
                      name="Income"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />

                    <Bar
                      dataKey="expense"
                      name="Expense"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="reports-empty">
                No monthly data available.
              </div>
            )}
          </article>

          <article className="reports-panel">
            <div className="reports-panel-head">
              <div>
                <h2 className="reports-panel-title">
                  Savings Trend
                </h2>

                <p className="reports-panel-subtitle">
                  Net savings by month.
                </p>
              </div>
            </div>

            {monthly.length ? (
              <div className="reports-chart">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart data={monthly}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e0e4f5"
                    />

                    <XAxis
                      dataKey="month"
                      tick={{
                        fontSize: 10,
                        fill: "#64748b",
                      }}
                    />

                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "#64748b",
                      }}
                    />

                    <Tooltip
                      formatter={(value) =>
                        money(value)
                      }
                    />

                    <Bar
                      dataKey="net"
                      name="Net Savings"
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="reports-empty">
                No savings data available.
              </div>
            )}
          </article>
        </section>

        <section className="reports-grid equal">
          <article className="reports-panel">
            <div className="reports-panel-head">
              <div>
                <h2 className="reports-panel-title">
                  Expense by Category
                </h2>

                <p className="reports-panel-subtitle">
                  Where your money is being spent.
                </p>
              </div>

              <PieChartIcon
                size={17}
                color="#4f46e5"
              />
            </div>

            {expenseData.length ? (
              <div className="reports-chart small">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={expenseData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={96}
                      paddingAngle={2}
                    >
                      {expenseData.map(
                        (item, index) => (
                          <Cell
                            key={`${item.name}-${index}`}
                            fill={
                              colors[
                                index % colors.length
                              ]
                            }
                          />
                        )
                      )}
                    </Pie>

                    <Tooltip
                      formatter={(value) =>
                        money(value)
                      }
                    />

                    <Legend
                      wrapperStyle={{
                        fontSize: 10,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="reports-empty">
                No expense categories found.
              </div>
            )}
          </article>

          <article className="reports-panel">
            <div className="reports-panel-head">
              <div>
                <h2 className="reports-panel-title">
                  Income by Category
                </h2>

                <p className="reports-panel-subtitle">
                  Sources contributing to your income.
                </p>
              </div>

              <PieChartIcon
                size={17}
                color="#059669"
              />
            </div>

            {incomeData.length ? (
              <div className="reports-chart small">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={incomeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={96}
                      paddingAngle={2}
                    >
                      {incomeData.map(
                        (item, index) => (
                          <Cell
                            key={`${item.name}-${index}`}
                            fill={
                              colors[
                                index % colors.length
                              ]
                            }
                          />
                        )
                      )}
                    </Pie>

                    <Tooltip
                      formatter={(value) =>
                        money(value)
                      }
                    />

                    <Legend
                      wrapperStyle={{
                        fontSize: 10,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="reports-empty">
                No income categories found.
              </div>
            )}
          </article>
        </section>

        <article className="reports-panel">
          <div className="reports-panel-head">
            <div>
              <h2 className="reports-panel-title">
                Account Performance
              </h2>

              <p className="reports-panel-subtitle">
                Balance and cash flow for each connected
                account.
              </p>
            </div>
          </div>

          {accounts.length ? (
            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Balance</th>
                    <th>Income</th>
                    <th>Expense</th>
                    <th>Net</th>
                  </tr>
                </thead>

                <tbody>
                  {accounts.map((account) => {
                    const accountNet =
                      num(account.net);

                    return (
                      <tr key={account.accountId}>
                        <td>
                          <div className="account-name">
                            {account.accountName}
                          </div>

                          <div className="account-type">
                            {account.accountType} ·{" "}
                            {account.currency}
                          </div>
                        </td>

                        <td className="neutral">
                          {money(account.balance)}
                        </td>

                        <td className="positive">
                          {money(account.totalIncome)}
                        </td>

                        <td className="negative">
                          {money(account.totalExpense)}
                        </td>

                        <td
                          className={
                            accountNet >= 0
                              ? "positive"
                              : "negative"
                          }
                        >
                          {money(accountNet)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="reports-empty">
              No account data available.
            </div>
          )}

          <div className="reports-note">
            Uses the same dashboard reporting endpoints
            as the existing Dashboard.
          </div>
        </article>
          </>
        )}
      </div>
    </>
  );
}

export default Reports;
