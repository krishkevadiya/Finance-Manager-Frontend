import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import api from "../api/axios";
import Loader from "../components/common/Loader";
import CustomSelect, { SelectOption } from "../components/common/CustomSelect";

type TransactionType = "income" | "expense";

type CategoryType = "income" | "expense" | "both";

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number | string;
  currency: string;
}

interface Transaction {
  id: number;
  type: TransactionType;
  amount: number | string;
  category: string;
  description?: string | null;
  transactionDate?: string;
  createdAt?: string;
  account?: Account;
}

interface BudgetStatus {
  budgetId: number;
  categoryId: number;
  category: string;
  month: number;
  year: number;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  exceeded: boolean;
  exceededBy: number;
}

interface AccountsResponse {
  accounts?: Account[];
}

interface Category {
  id: number;
  name: string;
  type: CategoryType;
  userId?: number;
  createdAt?: string;
}

interface CategoriesResponse {
  categories?: Category[];
}

interface TransactionsResponse {
  transactions?: Transaction[];
  pagination?: {
    page?: number;
    limit?: number;
    totalRecords?: number;
    totalPages?: number;
  };
}

interface TransactionMutationResponse {
  message?: string;
  transaction?: Transaction;
  updatedBalance?: number;
  budgetStatus?: BudgetStatus | null;
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

interface TransactionForm {
  type: TransactionType;
  amount: string;
  category: string;
  description: string;
  accountId: string;
  transactionDate: string;
}

interface TransactionFilters {
  type: string;
  accountId: string;
  category: string;
  startDate: string;
  endDate: string;
}

const getToday = (): string =>
  new Date().toISOString().slice(0, 10);

const emptyForm: TransactionForm = {
  type: "expense",
  amount: "",
  category: "",
  description: "",
  accountId: "",
  transactionDate: getToday(),
};

const emptyFilters: TransactionFilters = {
  type: "",
  accountId: "",
  category: "",
  startDate: "",
  endDate: "",
};


const getCategoryLabel = (category: Category): string => {
  if (category.type === "both") {
    return `${category.name} (Income & Expense)`;
  }

  return category.type === "income"
    ? `${category.name} (Income)`
    : `${category.name} (Expense)`;
};

const getNumber = (
  value: number | string | undefined | null
): number => {
  const number = Number(value ?? 0);

  return Number.isFinite(number) ? number : 0;
};

const formatMoney = (
  value: number | string | undefined | null,
  currency = "INR"
): string => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(getNumber(value));
  } catch {
    return `₹${getNumber(value).toFixed(2)}`;
  }
};

const formatDate = (
  value?: string
): string => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getErrorMessage = (
  error: unknown
): string => {
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
      "Something went wrong."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
};

/*
 * Reads value without using
 * event.target.value.
 */
const getEventValue = (
  event: unknown
): string => {
  if (
    typeof event === "object" &&
    event !== null &&
    "currentTarget" in event
  ) {
    const currentTarget = (
      event as {
        currentTarget?: {
          value?: unknown;
        };
      }
    ).currentTarget;

    if (
      currentTarget &&
      typeof currentTarget.value === "string"
    ) {
      return currentTarget.value;
    }
  }

  return "";
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

const parseInputDate = (value: string): Date | null => {
  if (!value) {
    return null;
  }

  const parts = value.split("-").map(Number);

  if (
    parts.length !== 3 ||
    parts.some((part) => !Number.isInteger(part))
  ) {
    return null;
  }

  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;
};

const toInputDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

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
  const today = new Date();
  const selectedDate = parseInputDate(value);

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

  const [calendarView, setCalendarView] = useState<"days" | "months" | "years">("days");
  const [calendarMonth, setCalendarMonth] = useState<Date>(
    selectedDate
      ? new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          1
        )
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

  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const isDisabled = (dateString: string): boolean => {
    return Boolean(
      (minDate && dateString < minDate) ||
        (maxDate && dateString > maxDate)
    );
  };

  const monthNames = Array.from({ length: 12 }, (_, index) =>
    new Date(2000, index, 1).toLocaleDateString("en-IN", {
      month: "long",
    })
  );

  const yearStart = calendarMonth.getFullYear() - 10;
  const years = Array.from({ length: 21 }, (_, index) => yearStart + index);

  const moveMonth = (amount: number) => {
    setCalendarMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + amount,
          1
        )
    );
  };

  const selectMonth = (monthIndex: number) => {
    setCalendarMonth(
      (current) => new Date(current.getFullYear(), monthIndex, 1)
    );
    setCalendarView("days");
  };

  const selectYear = (year: number) => {
    setCalendarMonth(
      (current) => new Date(year, current.getMonth(), 1)
    );
    setCalendarView("days");
  };

  const selectDate = (dateString: string) => {
    if (isDisabled(dateString)) {
      return;
    }

    onChange(dateString);
    setOpen(false);
  };

  const openCalendar = () => {
    if (selectedDate) {
      setCalendarMonth(
        new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          1
        )
      );
    }

    setOpen((current) => {
      const nextOpen = !current;
      if (nextOpen) {
        setCalendarView("days");
      }
      return nextOpen;
    });
  };

  const todayString = toInputDate(today);

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Select date";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
      }}
    >
      <label
        style={{
          display: "block",
          marginBottom: 8,
          fontSize: 13,
          fontWeight: 700,
          color: "#334155",
        }}
      >
        {label}
      </label>

      <button
        type="button"
        onClick={openCalendar}
        aria-expanded={open}
        style={{
          width: "100%",
          minHeight: 48,
          padding: "0 12px",
          border: open
            ? "1px solid #3b5bdb"
            : "1px solid #dbe3ef",
          borderRadius: 12,
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          cursor: "pointer",
          boxSizing: "border-box",
          boxShadow: open
            ? "0 0 0 3px rgba(37, 99, 235, 0.10)"
            : "0 1px 2px rgba(15, 23, 42, 0.04)",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
          }}
        >
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

        <ChevronDown
          size={16}
          style={{
            color: "#64748b",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 180ms ease",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 60,
            top: "calc(100% + 8px)",
            left: align === "right" ? "auto" : 0,
            right: align === "right" ? 0 : "auto",
            width: "min(340px, calc(100vw - 24px))",
            padding: 18,
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            background: "#ffffff",
            boxShadow:
              "0 20px 45px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.06)",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              aria-label="Previous month"
              style={{
                width: 38,
                height: 38,
                border: "1px solid #dbe3ef",
                borderRadius: 10,
                background: "#ffffff",
                color: "#334155",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <ChevronLeft size={18} />
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                flex: 1,
              }}
            >
              <button
                type="button"
                onClick={() => setCalendarView("months")}
                style={{
                  border: "none",
                  background: calendarView === "months" ? "#eaedff" : "transparent",
                  borderRadius: 8,
                  padding: "7px 8px",
                  color: "#0f172a",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                aria-label="Select month"
              >
                {calendarMonth.toLocaleDateString("en-IN", { month: "long" })}
              </button>

              <button
                type="button"
                onClick={() => setCalendarView("years")}
                style={{
                  border: "none",
                  background: calendarView === "years" ? "#eaedff" : "transparent",
                  borderRadius: 8,
                  padding: "7px 8px",
                  color: "#0f172a",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                aria-label="Select year"
              >
                {calendarMonth.getFullYear()}
              </button>
            </div>

            <button
              type="button"
              onClick={() => moveMonth(1)}
              aria-label="Next month"
              style={{
                width: 38,
                height: 38,
                border: "1px solid #dbe3ef",
                borderRadius: 10,
                background: "#ffffff",
                color: "#334155",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {calendarView === "months" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                padding: "4px 0 6px",
              }}
            >
              {monthNames.map((monthName, index) => {
                const selected = index === calendarMonth.getMonth();
                return (
                  <button
                    key={monthName}
                    type="button"
                    onClick={() => selectMonth(index)}
                    style={{
                      minHeight: 44,
                      border: selected ? "1px solid #7db5ff" : "1px solid transparent",
                      borderRadius: 11,
                      background: selected ? "#eaedff" : "transparent",
                      color: selected ? "#3b5bdb" : "#0f172a",
                      fontSize: 13,
                      fontWeight: selected ? 700 : 500,
                      cursor: "pointer",
                    }}
                  >
                    {monthName}
                  </button>
                );
              })}
            </div>
          )}

          {calendarView === "years" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                maxHeight: 220,
                overflowY: "auto",
                padding: "4px 2px 6px",
              }}
            >
              {years.map((year) => {
                const selected = year === calendarMonth.getFullYear();
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => selectYear(year)}
                    style={{
                      minHeight: 42,
                      border: selected ? "1px solid #7db5ff" : "1px solid transparent",
                      borderRadius: 11,
                      background: selected ? "#eaedff" : "transparent",
                      color: selected ? "#3b5bdb" : "#0f172a",
                      fontSize: 13,
                      fontWeight: selected ? 700 : 500,
                      cursor: "pointer",
                    }}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          )}

          {calendarView === "days" && (
            <>
              <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
              marginBottom: 6,
            }}
          >
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(
              (day) => (
                <span
                  key={day}
                  style={{
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#94a3b8",
                    padding: "5px 0",
                  }}
                >
                  {day}
                </span>
              )
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
            }}
          >
            {Array.from({ length: totalCells }, (_, index) => {
              const dayNumber = index - firstDay + 1;

              if (dayNumber < 1 || dayNumber > daysInMonth) {
                return (
                  <span
                    key={`empty-${index}`}
                    style={{ height: 36 }}
                  />
                );
              }

              const date = new Date(
                calendarMonth.getFullYear(),
                calendarMonth.getMonth(),
                dayNumber
              );

              const dateString = toInputDate(date);
              const disabled = isDisabled(dateString);
              const selected = dateString === value;
              const isToday = dateString === todayString;

              return (
                <button
                  type="button"
                  key={dateString}
                  disabled={disabled}
                  onClick={() => selectDate(dateString)}
                  style={{
                    height: 40,
                    border:
                      selected
                        ? "1px solid #7db5ff"
                        : isToday
                          ? "1px solid #cfe2ff"
                          : "1px solid transparent",
                    borderRadius: 11,
                    background: selected
                      ? "#eaedff"
                      : isToday
                        ? "#f8fbff"
                        : "transparent",
                    color: disabled
                      ? "#cbd5e1"
                      : "#0f172a",
                    fontSize: 13,
                    fontWeight:
                      selected || isToday ? 700 : 500,
                    cursor: disabled
                      ? "not-allowed"
                      : "pointer",
                    opacity: disabled ? 0.7 : 1,
                  }}
                >
                  {dayNumber}
                </button>
              );
            })}
              </div>
            </>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 16,
              paddingTop: 14,
              borderTop: "1px solid #e8ecff",
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (!isDisabled(todayString)) {
                  onChange(todayString);
                  setCalendarMonth(
                    new Date(
                      today.getFullYear(),
                      today.getMonth(),
                      1
                    )
                  );
                  setOpen(false);
                }
              }}
              style={{
                border: "none",
                background: "transparent",
                color: "#3b5bdb",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
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
              style={{
                border: "none",
                background: "transparent",
                color: value ? "#64748b" : "#cbd5e1",
                fontSize: 14,
                fontWeight: 600,
                cursor: value ? "pointer" : "not-allowed",
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Transactions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const accountIdFromUrl = (() => {
    const value = searchParams.get("accountId") ?? "";

    if (!/^\d+$/.test(value)) {
      return "";
    }

    return Number(value) > 0 ? value : "";
  })();

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [page, setPage] =
    useState(1);

  const [totalPages, setTotalPages] =
    useState(1);

  const [totalRecords, setTotalRecords] =
    useState(0);

  const [goToPage, setGoToPage] =
    useState(1);

  const [isGoToOpen, setIsGoToOpen] =
    useState(false);

  useEffect(() => {
    setGoToPage(page);
  }, [page]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [filters, setFilters] =
    useState<TransactionFilters>({
      ...emptyFilters,
      accountId: accountIdFromUrl,
    });

  const [appliedFilters, setAppliedFilters] =
    useState<TransactionFilters>({
      ...emptyFilters,
      accountId: accountIdFromUrl,
    });

  const [showFilterCard, setShowFilterCard] = useState(false);
  const [openControl, setOpenControl] = useState<string | null>(null);

  const typeOptions: SelectOption[] = [
    { value: "", label: "All Types" },
    { value: "income", label: "Income" },
    { value: "expense", label: "Expense" },
  ];

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.type) count++;
    if (appliedFilters.accountId) count++;
    if (appliedFilters.category) count++;
    if (appliedFilters.startDate) count++;
    if (appliedFilters.endDate) count++;
    return count;
  }, [appliedFilters]);

  const [showModal, setShowModal] =
    useState(false);

  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const [formData, setFormData] =
    useState<TransactionForm>({
      ...emptyForm,
    });

  const [formError, setFormError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [budgetAlert, setBudgetAlert] =
    useState<BudgetStatus | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<Transaction | null>(null);
    


  /* =========================
     LOAD ACCOUNTS
  ========================= */

  const fetchAccounts =
    useCallback(async () => {
      try {
        const response =
          await api.get<AccountsResponse>(
            "/accounts"
          );

        setAccounts(
          response.data?.accounts ?? []
        );
      } catch (requestError: unknown) {
        setError(
          getErrorMessage(requestError)
        );
      }
    }, []);

  /* =========================
     LOAD CATEGORIES
  ========================= */

  const fetchCategories =
    useCallback(async () => {
      try {
        const response =
          await api.get<CategoriesResponse>(
            "/categories"
          );

        setCategories(
          response.data?.categories ?? []
        );
      } catch (requestError: unknown) {
        setError(
          getErrorMessage(requestError)
        );
      }
    }, []);

  /* =========================
     LOAD TRANSACTIONS
  ========================= */

  const fetchTransactions =
    useCallback(async (isInitial = false) => {
      try {
        if (isInitial) {
          setLoading(true);
        }
        setError("");

        const params: Record<
          string,
          string | number
        > = {
          page,
          limit: 10,
        };

        if (appliedFilters.type) {
          params.type =
            appliedFilters.type;
        }

        if (appliedFilters.accountId) {
          params.accountId =
            appliedFilters.accountId;
        }

        if (
          appliedFilters.category.trim()
        ) {
          params.category =
            appliedFilters.category.trim();
        }

        if (appliedFilters.startDate) {
          params.startDate =
            appliedFilters.startDate;
        }

        if (appliedFilters.endDate) {
          params.endDate =
            appliedFilters.endDate;
        }

        const response =
          await api.get<TransactionsResponse>(
            "/transactions",
            {
              params,
            }
          );

        setTransactions(
          response.data?.transactions ?? []
        );

        setTotalRecords(
          response.data?.pagination
            ?.totalRecords ?? 0
        );

        setTotalPages(
          response.data?.pagination
            ?.totalPages ?? 1
        );
      } catch (requestError: unknown) {
        setError(
          getErrorMessage(requestError)
        );

        setTransactions([]);
      } finally {
        if (isInitial) {
          setLoading(false);
        }
      }
    }, [page, appliedFilters]);

  /* =========================
     INITIAL & FILTER LOAD
  ========================= */

  const isFirstMount = useRef(true);

  useEffect(() => {
    void fetchAccounts();
    void fetchCategories();
  }, [fetchAccounts, fetchCategories]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      void fetchTransactions(true);
    } else {
      void fetchTransactions(false);
    }
  }, [fetchTransactions]);

  
  /* =========================
     TOTALS
  ========================= */

  const pageIncome =
    useMemo(() => {
      return transactions
        .filter(
          (transaction) =>
            transaction.type === "income"
        )
        .reduce(
          (total, transaction) =>
            total +
            getNumber(
              transaction.amount
            ),
          0
        );
    }, [transactions]);

  const pageExpense =
    useMemo(() => {
      return transactions
        .filter(
          (transaction) =>
            transaction.type === "expense"
        )
        .reduce(
          (total, transaction) =>
            total +
            getNumber(
              transaction.amount
            ),
          0
        );
    }, [transactions]);

  /* =========================
     PAGINATION
  ========================= */

  const paginationItems = useMemo(() => {
    const items: (number | string)[] = [];
    if (totalPages <= 6) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      if (page <= 2) {
        items.push(1, 2, 3, "ellipsis-next", totalPages);
      } else if (page === 3) {
        items.push(1, 2, 3, 4, "ellipsis-next", totalPages);
      } else if (page >= totalPages - 1) {
        items.push(1, "ellipsis-prev", totalPages - 2, totalPages - 1, totalPages);
      } else if (page === totalPages - 2) {
        items.push(1, "ellipsis-prev", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        items.push(1, "ellipsis-prev", page - 1, page, page + 1, "ellipsis-next", totalPages);
      }
    }
    return items;
  }, [page, totalPages]);

  const pageSelectOptions: SelectOption[] = useMemo(() => {
    return Array.from({ length: totalPages }, (_, i) => ({
      value: String(i + 1),
      label: String(i + 1),
    }));
  }, [totalPages]);

  /* =========================
     FILTERS
  ========================= */

  const updateFilter = (
    field: keyof TransactionFilters,
    value: string
  ) => {
    setFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const applyFilters = () => {
    if (
      filters.startDate &&
      filters.endDate &&
      filters.startDate > filters.endDate
    ) {
      setError("Start date cannot be later than end date.");
      return;
    }

    setError("");
    setPage(1);

    setAppliedFilters({
      ...filters,
    });
    setShowFilterCard(false);
  };

  const clearFilters = () => {
    const cleared = {
      ...emptyFilters,
    };

    setFilters(cleared);
    setAppliedFilters(cleared);
    setPage(1);
    setShowFilterCard(false);
  };
  

  /* =========================
     REFRESH
  ========================= */

  const handleRefresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    setError("");

    try {
      await Promise.all([
        fetchAccounts(),
        fetchCategories(),
        fetchTransactions(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  /* =========================
     CREATE
  ========================= */

  const openCreate = () => {
    setEditingTransaction(null);

    setFormData({
      ...emptyForm,
      accountId:
        accounts.length > 0
          ? String(accounts[0].id)
          : "",
    });

    setFormError("");
    setShowModal(true);
  };

  /* =========================
     EDIT
  ========================= */

  const openEdit = (
    transaction: Transaction
  ) => {
    setEditingTransaction(transaction);

    setFormData({
      type: transaction.type,
      amount: String(
        transaction.amount
      ),
      category:
        transaction.category ?? "",
      description:
        transaction.description ?? "",
      accountId:
        transaction.account?.id !==
        undefined
          ? String(transaction.account.id)
          : "",
      transactionDate:
        transaction.transactionDate
          ? transaction.transactionDate.slice(
              0,
              10
            )
          : getToday(),
    });

    setFormError("");
    setShowModal(true);
  };

  /* =========================
     CLOSE MODAL
  ========================= */

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingTransaction(null);
    setFormError("");

    setFormData({
      ...emptyForm,
    });
  };

  /* =========================
     FORM INPUT
  ========================= */

  const updateFormField = (
    field: keyof TransactionForm,
    event: unknown
  ) => {
    const value =
      getEventValue(event);

    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  /* =========================
     SAVE
  ========================= */

  const handleSubmit = async (
    event: unknown
  ) => {
    if (
      typeof event === "object" &&
      event !== null &&
      "preventDefault" in event
    ) {
      (
        event as {
          preventDefault: () => void;
        }
      ).preventDefault();
    }

    setFormError("");

    if (!formData.accountId) {
      setFormError(
        "Please select an account."
      );
      return;
    }

    const amount =
      Number(formData.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setFormError(
        "Amount must be greater than 0."
      );
      return;
    }

    if (!formData.category.trim()) {
      setFormError("Category is required.");
      return;
    }

    const selectedCategory = categories.find(
      (category) =>
        category.name.toLowerCase() ===
        formData.category.trim().toLowerCase()
    );

    if (
      selectedCategory &&
      selectedCategory.type !== formData.type &&
      selectedCategory.type !== "both"
    ) {
      setFormError(
        `The selected category is only available for ${selectedCategory.type === "income" ? "income" : "expense"} transactions.`
      );
      return;
    }

    if (!formData.transactionDate) {
      setFormError(
        "Transaction date is required."
      );
      return;
    }

    setSaving(true);

    const payload = {
      type: formData.type,
      amount,
      category:
        formData.category.trim(),
      description:
        formData.description.trim(),
      accountId:
        Number(formData.accountId),
      transactionDate:
        formData.transactionDate,
    };

    try {
      let response;

      if (editingTransaction) {
        response = await api.put<TransactionMutationResponse>(
          `/transactions/${editingTransaction.id}`,
          payload
        );
      } else {
        response = await api.post<TransactionMutationResponse>(
          "/transactions",
          payload
        );
      }

      const budgetStatus =
        response.data?.budgetStatus;

      if (budgetStatus?.exceeded) {
        setBudgetAlert(budgetStatus);
      } else {
        setBudgetAlert(null);
      }

      setShowModal(false);
      setEditingTransaction(null);

      setFormData({
        ...emptyForm,
      });

      await Promise.all([
        fetchAccounts(),
        fetchTransactions(),
      ]);
    } catch (requestError: unknown) {
      setFormError(
        getErrorMessage(requestError)
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     OPEN DELETE CONFIRMATION
  ========================= */

  const openDelete = (
    transaction: Transaction
  ) => {
    setDeleteTarget(transaction);
  };

  /* =========================
     DELETE
  ========================= */

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    const transactionId =
      deleteTarget.id;

    setDeletingId(transactionId);
    setError("");

    try {
      await api.delete(
        `/transactions/${transactionId}`
      );

      setDeleteTarget(null);

      await Promise.all([
        fetchAccounts(),
        fetchTransactions(),
      ]);
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(requestError)
      );
    } finally {
      setDeletingId(null);
    }
  };

  const availableCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.type === formData.type ||
          category.type === "both"
      ),
    [categories, formData.type]
  );

  const currentCategoryExists = useMemo(
    () =>
      availableCategories.some(
        (category) =>
          category.name === formData.category
      ),
    [availableCategories, formData.category]
  );

  const accountOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: "All Accounts" },
      ...accounts.map((account) => ({
        value: String(account.id),
        label: account.name,
      })),
    ],
    [accounts]
  );

  const categoryOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: "All Categories" },
      ...categories
        .filter((category) =>
          filters.type
            ? category.type === filters.type ||
              category.type === "both"
            : true
        )
        .map((category) => ({
          value: category.name,
          label: getCategoryLabel(category),
        })),
    ],
    [categories, filters.type]
  );

  return (
    <main className="dashboard-page">

      <div className="dashboard-container">

        {/* HEADER */}

        <header className="dashboard-header">

          <div>

            <p className="eyebrow">
              Finance Management
            </p>

            <h1>
              Transactions
            </h1>

            <p className="page-subtitle">
              Track and manage your income and expenses
            </p>

          </div>

          <div className="header-actions">
            <button
              type="button"
              className={`header-filter-btn ${activeFilterCount > 0 ? "active" : ""}`}
              onClick={() => {
                setShowFilterCard((prev) => {
                  if (prev) setOpenControl(null);
                  return !prev;
                });
              }}
              aria-label="Filter transactions"
            >
              <Filter size={14} />
              <span>
                {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}
              </span>
              {activeFilterCount > 0 && (
                <span className="filter-active-dot" />
              )}
            </button>

            <button
              type="button"
              className="primary-button compact-btn"
              onClick={openCreate}
            >
              <Plus size={16} />
              Add Transaction
            </button>

            {showFilterCard && (
              <>
                <div
                  className="header-filter-backdrop"
                  onClick={() => {
                    setShowFilterCard(false);
                    setOpenControl(null);
                  }}
                />
                <div
                  className="header-filter-dropdown"
                  style={{ width: "min(380px, calc(100vw - 32px))" }}
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
                      <Filter size={16} color="#3b5bdb" />
                      <strong style={{ fontSize: 14, color: "#0f172a" }}>
                        Filter Transactions
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFilterCard(false);
                        setOpenControl(null);
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

                  <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                    <CustomSelect
                      label="Type"
                      value={filters.type}
                      options={typeOptions}
                      onChange={(value) => updateFilter("type", value)}
                      isOpen={openControl === "type"}
                      onOpenChange={(isOpen) =>
                        setOpenControl(isOpen ? "type" : null)
                      }
                      zIndex={75}
                    />

                    <CustomSelect
                      label="Account"
                      value={filters.accountId}
                      options={accountOptions}
                      onChange={(value) => updateFilter("accountId", value)}
                      isOpen={openControl === "account"}
                      onOpenChange={(isOpen) =>
                        setOpenControl(isOpen ? "account" : null)
                      }
                      zIndex={74}
                    />

                    <CustomSelect
                      label="Category"
                      value={filters.category}
                      options={categoryOptions}
                      onChange={(value) => updateFilter("category", value)}
                      isOpen={openControl === "category"}
                      onOpenChange={(isOpen) =>
                        setOpenControl(isOpen ? "category" : null)
                      }
                      zIndex={73}
                    />

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      <DatePicker
                        label="Start Date"
                        value={filters.startDate}
                        onChange={(value) => updateFilter("startDate", value)}
                        maxDate={filters.endDate || undefined}
                        isOpen={openControl === "start"}
                        onOpenChange={(isOpen) =>
                          setOpenControl(isOpen ? "start" : null)
                        }
                        align="left"
                      />
                      <DatePicker
                        label="End Date"
                        value={filters.endDate}
                        onChange={(value) => updateFilter("endDate", value)}
                        minDate={filters.startDate || undefined}
                        isOpen={openControl === "end"}
                        onOpenChange={(isOpen) =>
                          setOpenControl(isOpen ? "end" : null)
                        }
                        align="right"
                      />
                    </div>
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
                        setOpenControl(null);
                        applyFilters();
                      }}
                    >
                      Apply Filters
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ borderRadius: 12 }}
                      onClick={() => {
                        setOpenControl(null);
                        clearFilters();
                      }}
                      disabled={
                        activeFilterCount === 0 &&
                        !filters.type &&
                        !filters.accountId &&
                        !filters.category &&
                        !filters.startDate &&
                        !filters.endDate
                      }
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

        </header>

        {/* ERROR */}

        {error && (
          <div
            className="error-alert"
            role="alert"
          >

            <span>
              {error}
            </span>

            <button
              type="button"
              className="error-button"
              onClick={() => {
                void handleRefresh();
              }}
            >
              Try again
            </button>

          </div>
        )}

        {budgetAlert && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              position: "fixed",
              top: 24,
              right: 24,
              zIndex: 9999,
              width: "min(420px, calc(100vw - 32px))",
              display: "flex",
              alignItems: "flex-start",
              gap: 13,
              padding: 16,
              boxSizing: "border-box",
              border: "1px solid #fecaca",
              borderRadius: 16,
              background: "linear-gradient(135deg, #fff7f7 0%, #fef2f2 100%)",
              boxShadow: "0 18px 45px rgba(127, 29, 29, 0.16), 0 5px 16px rgba(15, 23, 42, 0.08)",
              animation: "budgetAlertSlideIn 0.28s ease-out",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                flex: "0 0 40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 11,
                color: "#dc2626",
                background: "#fee2e2",
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              !
            </div>

            <div
              style={{
                minWidth: 0,
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <strong
                style={{
                  color: "#991b1b",
                  fontSize: 14,
                  lineHeight: 1.3,
                  fontWeight: 800,
                }}
              >
                Budget Exceeded
              </strong>

              <span
                style={{
                  color: "#b91c1c",
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                {budgetAlert.category} budget has been exceeded by {" "}
                {formatMoney(budgetAlert.exceededBy)}.
              </span>

              <small
                style={{
                  color: "#7f1d1d",
                  fontSize: 11,
                  lineHeight: 1.4,
                }}
              >
                Spent {formatMoney(budgetAlert.spentAmount)} of {" "}
                {formatMoney(budgetAlert.budgetAmount)} ({" "}
                {budgetAlert.percentageUsed.toFixed(0)}%).
              </small>
            </div>

            <button
              type="button"
              aria-label="Dismiss budget warning"
              onClick={() => setBudgetAlert(null)}
              style={{
                width: 30,
                height: 30,
                flex: "0 0 30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: 0,
                borderRadius: 8,
                color: "#991b1b",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <X size={17} />
            </button>
          </div>
        )}

        <style>{`
          @keyframes budgetAlertSlideIn {
            from {
              opacity: 0;
              transform: translateY(-12px) translateX(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0) translateX(0);
            }
          }

          @media (max-width: 600px) {
            .budget-warning-mobile-safe {
              left: 14px;
              right: 14px;
              width: auto !important;
            }
          }
        `}</style>



        {loading ? (
          <Loader message="Loading transactions..." fullScreen={false} />
        ) : (
          <>
            {/* SUMMARY */}

            <section className="stats-grid">

          <div className="stat-card">
            <div className="stat-card-top">
              <p className="stat-label">
                Total Records
              </p>
              <div className="stat-icon blue-icon">
                <Wallet size={18} />
              </div>
            </div>

            <h2>
              {totalRecords}
            </h2>

            <p className="stat-description">
              Total recorded transactions
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <p className="stat-label">
                Income
              </p>
              <div className="stat-icon green-icon">
                <ArrowUpRight size={18} />
              </div>
            </div>

            <h2 className="income-value">
              {formatMoney(pageIncome)}
            </h2>

            <p className="stat-description">
              Income on this page
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <p className="stat-label">
                Expense
              </p>
              <div className="stat-icon red-icon">
                <ArrowDownRight size={18} />
              </div>
            </div>

            <h2 className="expense-value">
              {formatMoney(pageExpense)}
            </h2>

            <p className="stat-description">
              Expenses on this page
            </p>
          </div>


        </section>

        

        {/* TRANSACTION TABLE */}

        <section className="panel transactions-panel">

          <div className="panel-header">

            <div>

              <h2>
                All Transactions
              </h2>

              <p>
                Page {page} of{" "}
                {totalPages}
              </p>

            </div>

            <div className="transaction-count">
              {totalRecords} records
            </div>

          </div>

          {transactions.length ===
          0 ? (

            <div className="empty-state">
              No transactions found.
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
                      Account
                    </th>

                    <th>
                      Date
                    </th>

                    <th>
                      Amount
                    </th>

                    <th>
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {transactions.map(
                    (transaction) => {

                      const income =
                        transaction.type ===
                        "income";

                      return (
                        <tr
                          key={
                            transaction.id
                          }
                        >

                          <td>

                            <div className="transaction-description">

                              <div
                                className={
                                  income
                                    ? "transaction-icon income-transaction"
                                    : "transaction-icon expense-transaction"
                                }
                              >

                                {income ? (
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
                                {
                                  transaction.description ||
                                  "Transaction"
                                }
                              </span>

                            </div>

                          </td>

                          <td>
                            {
                              transaction.category
                            }
                          </td>

                          <td>
                            {
                              transaction.account
                                ?.name ??
                              "—"
                            }
                          </td>

                          <td>
                            {formatDate(
                              transaction.transactionDate
                            )}
                          </td>

                          <td
                            className={
                              income
                                ? "income-text"
                                : "expense-text"
                            }
                          >

                            {income
                              ? "+"
                              : "-"}

                            {formatMoney(
                              transaction.amount
                            )}

                          </td>

                          <td>

                            <div className="account-card-actions">

                              <button
                                type="button"
                                className="icon-button"
                                title="Edit transaction"
                                onClick={() =>
                                  openEdit(
                                    transaction
                                  )
                                }
                              >
                                <Edit3
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                className="icon-button delete-icon-button"
                                title="Delete transaction"
                                onClick={() =>
                                  openDelete(
                                    transaction
                                  )
                                }
                                disabled={
                                  deletingId ===
                                  transaction.id
                                }
                              >

                                {deletingId ===
                                transaction.id ? (
                                  <RefreshCw
                                    size={16}
                                    className="spin"
                                  />
                                ) : (
                                  <Trash2
                                    size={16}
                                  />
                                )}

                              </button>

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

          {totalPages > 1 && (
            <div
              className="pagination-container"
              role="navigation"
              aria-label="Pagination"
              style={{
                marginBottom: isGoToOpen ? 95 : 12,
                transition: "margin-bottom 0.2s ease",
              }}
            >
              <button
                type="button"
                className="pagination-btn pagination-arrow-btn"
                disabled={page <= 1}
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                aria-label="Previous page"
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="pagination-pages">
                {paginationItems.map((item, idx) => {
                  if (typeof item === "string") {
                    return (
                      <span
                        key={`${item}-${idx}`}
                        className="pagination-ellipsis"
                        aria-hidden="true"
                      >
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={item}
                      type="button"
                      className={`pagination-btn pagination-page-btn ${item === page ? "active" : ""}`}
                      onClick={() => setPage(item)}
                      aria-current={item === page ? "page" : undefined}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="pagination-btn pagination-arrow-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
                aria-label="Next page"
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>

              <div className="pagination-divider" aria-hidden="true" />

              <div className="pagination-goto">
                <span className="pagination-goto-label">Go to:</span>
                <div style={{ width: 72 }}>
                  <CustomSelect
                    value={String(goToPage)}
                    options={pageSelectOptions}
                    onChange={(val) => {
                      const nextPage = Number(val);
                      setGoToPage(nextPage);
                      setPage(nextPage);
                    }}
                    onOpenChange={setIsGoToOpen}
                    minHeight={38}
                    borderRadius={8}
                    menuPlacement="bottom"
                    menuWidth={78}
                    menuMaxHeight={115}
                    zIndex={90}
                    buttonStyle={{
                      height: 38,
                      minHeight: 38,
                      padding: "0 10px 0 12px",
                      fontSize: 14,
                      fontWeight: 500,
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

        </section>
          </>
        )}

      </div>

      {/* CREATE / EDIT MODAL */}

      {showModal && (
        <div className="modal-overlay">

          <div className="account-modal">

            <div className="modal-header">

              <div>

                <p className="eyebrow">
                  Transaction Management
                </p>

                <h2>
                  {editingTransaction
                    ? "Edit Transaction"
                    : "Add Transaction"}
                </h2>

              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={
                  closeModal
                }
                disabled={saving}
              >
                <X size={20} />
              </button>

            </div>

            <form
              className="account-form"
              onSubmit={(event) =>
                void handleSubmit(
                  event
                )
              }
            >

              <div className="form-field">

                <label>
                  Transaction Type
                </label>

                <select
                  value={
                    formData.type
                  }
                  onChange={(event) => {
                    const value = getEventValue(event);

                    const nextType: TransactionType =
                      value === "income"
                        ? "income"
                        : "expense";

                    setFormData((previous) => {
                      const selectedCategory =
                        categories.find(
                          (category) =>
                            category.name === previous.category
                        );

                      const categoryStillValid =
                        !selectedCategory ||
                        selectedCategory.type === nextType ||
                        selectedCategory.type === "both";

                      return {
                        ...previous,
                        type: nextType,
                        category: categoryStillValid
                          ? previous.category
                          : "",
                      };
                    });
                  }}
                >

                  <option value="expense">
                    Expense
                  </option>

                  <option value="income">
                    Income
                  </option>

                </select>

              </div>

              <div className="form-field">

                <label>
                  Amount
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={
                    formData.amount
                  }
                  onChange={(event) =>
                    updateFormField(
                      "amount",
                      event
                    )
                  }
                  placeholder="0.00"
                  required
                />

              </div>

              <div className="form-field">

                <label>
                  Account
                </label>

                <select
                  value={
                    formData.accountId
                  }
                  onChange={(event) =>
                    updateFormField(
                      "accountId",
                      event
                    )
                  }
                  required
                >

                  <option value="">
                    Select Account
                  </option>

                  {accounts.map(
                    (account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.name}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div className="form-field">

                <label>
                  Category
                </label>

                <select
                  value={formData.category}
                  onChange={(event) =>
                    updateFormField(
                      "category",
                      event
                    )
                  }
                  required
                >

                  <option value="">
                    Select Category
                  </option>

                  {formData.category &&
                  !currentCategoryExists ? (
                    <option value={formData.category}>
                      {formData.category} (current)
                    </option>
                  ) : null}

                  {availableCategories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.name}
                      >
                        {category.name}
                        {category.type === "both"
                          ? " (Income & Expense)"
                          : category.type === "income"
                            ? " (Income)"
                            : " (Expense)"}
                      </option>
                    )
                  )}

                </select>

                {categories.length === 0 && (
                  <span className="form-hint">
                    No categories available. Create one from the Categories page.
                  </span>
                )}

                {categories.some(
                  (category) => category.type === "both"
                ) && (
                  <span className="form-hint">
                    "Income & Expense" categories can be used for either transaction type.
                  </span>
                )}

                {categories.length > 0 &&
                  availableCategories.length === 0 && (
                    <span className="form-hint">
                      No category is available for this transaction type. Create an Income, Expense, or Income & Expense category first.
                    </span>
                  )}

              </div>

              <DatePicker
                label="Transaction Date"
                value={formData.transactionDate}
                onChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    transactionDate: value,
                  }))
                }
              />

              <div className="form-field">

                <label>
                  Description
                </label>

                <input
                  type="text"
                  value={
                    formData.description
                  }
                  onChange={(event) =>
                    updateFormField(
                      "description",
                      event
                    )
                  }
                  placeholder="Optional description"
                />

              </div>

              {formError && (
                <div
                  className="form-error"
                  role="alert"
                >
                  {formError}
                </div>
              )}

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >

                  {saving ? (
                    <>
                      <RefreshCw
                        size={17}
                        className="spin"
                      />

                      Saving...
                    </>
                  ) : editingTransaction ? (
                    "Update Transaction"
                  ) : (
                    "Create Transaction"
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* DELETE CONFIRMATION */}

      {deleteTarget && (
        <div className="modal-overlay">

          <div className="account-modal">

            <div className="modal-header">

              <div>

                <p className="eyebrow">
                  Transaction Management
                </p>

                <h2>
                  Delete Transaction
                </h2>

              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={() =>
                  setDeleteTarget(
                    null
                  )
                }
                disabled={
                  deletingId !== null
                }
              >
                <X size={20} />
              </button>

            </div>

            <div
              style={{
                padding:
                  "20px 0",
                color: "#475569",
                lineHeight: 1.6,
              }}
            >
              Are you sure you want
              to delete this
              transaction?
            </div>

            <div className="modal-actions">

              <button
                type="button"
                className="cancel-button"
                onClick={() =>
                  setDeleteTarget(
                    null
                  )
                }
                disabled={
                  deletingId !== null
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  void confirmDelete()
                }
                disabled={
                  deletingId !== null
                }
              >

                {deletingId !== null ? (
                  <>
                    <RefreshCw
                      size={17}
                      className="spin"
                    />

                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2
                      size={17}
                    />

                    Delete
                  </>
                )}

              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}

export default Transactions;``