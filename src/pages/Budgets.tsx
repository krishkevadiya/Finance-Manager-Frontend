import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowLeft,
  Beef,
  BookOpen,
  CalendarDays,
  Car,
  CheckCircle2,
  CreditCard,
  Edit3,
  Flame,
  Gamepad2,
  GraduationCap,
  Heart,
  Home,
  Laptop,
  Plane,
  Plus,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Stethoscope,
  Target,
  Trash2,
  TrendingUp,
  Tv,
  Utensils,
  WalletCards,
  Wifi,
  X,
  Zap,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import api from "../api/axios";
import Loader from "../components/common/Loader";
import CustomSelect, { SelectOption } from "../components/common/CustomSelect";

type CategoryType = "income" | "expense";

interface Category {
  id: number;
  name: string;
  type: CategoryType;
  userId?: number;
  createdAt?: string;
}

interface CategoriesResponse {
  categories: Category[];
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

interface Budget {
  id: number;
  amount: number | string;
  year: number;
  month: number;
  userId: number;
  categoryId: number;
  createdAt: string;
  category?: Category;
  budgetStatus?: BudgetStatus;
}

interface BudgetsResponse {
  budgets: Budget[];
}

interface BudgetForm {
  categoryId: string;
  amount: string;
  month: string;
  year: string;
}

const currentDate = new Date();

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_OPTIONS: SelectOption[] = MONTHS.map((month, index) => ({
  value: String(index + 1),
  label: month,
}));

const INITIAL_FORM: BudgetForm = {
  categoryId: "",
  amount: "",
  month: String(currentDate.getMonth() + 1),
  year: String(currentDate.getFullYear()),
};

function toNumber(
  value: number | string | null | undefined
): number {
  const result = Number(value ?? 0);

  return Number.isFinite(result) ? result : 0;
}

function formatCurrency(
  value: number | string
): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function getErrorMessage(
  error: unknown
): string {
  if (
    typeof error === "object" &&
    error !== null
  ) {
    const value = error as {
      response?: {
        data?: {
          message?: string;
          error?: string;
        };
      };
      message?: string;
    };

    return (
      value.response?.data?.message ||
      value.response?.data?.error ||
      value.message ||
      "Something went wrong."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function readValue(
  event: unknown
): string {
  const value = event as {
    target?: {
      value?: unknown;
    };
  };

  const result = value.target?.value;

  return typeof result === "string"
    ? result
    : "";
}

function browserConfirm(
  message: string
): boolean {
  const browser = globalThis as unknown as {
    confirm?: (
      message: string
    ) => boolean;
  };

  if (
    typeof browser.confirm ===
    "function"
  ) {
    return browser.confirm(message);
  }

  return true;
}

type IconComponent = React.ComponentType<{ size?: number; style?: React.CSSProperties }>;

function getCategoryIcon(name: string): IconComponent {
  const n = (name ?? "").toLowerCase();

  if (/food|eat|restaurant|dining|meal|lunch|dinner|breakfast|snack/.test(n)) return Utensils;
  if (/grocery|groceries|supermarket|market/.test(n)) return ShoppingCart;
  if (/transport|cab|taxi|uber|ola|bus|metro|fuel|petrol|diesel|commut/.test(n)) return Car;
  if (/flight|travel|trip|vacation|holiday|hotel|tour/.test(n)) return Plane;
  if (/rent|house|home|mortgage|property|apartment/.test(n)) return Home;
  if (/electric|electricity|power|utility|utilities|bill|water|gas/.test(n)) return Zap;
  if (/internet|wifi|broadband|data|mobile data/.test(n)) return Wifi;
  if (/phone|mobile|telecom/.test(n)) return Smartphone;
  if (/health|medical|doctor|hospital|medicine|pharmacy|clinic/.test(n)) return Stethoscope;
  if (/gym|fitness|sport|exercise|workout/.test(n)) return Heart;
  if (/education|school|college|course|study|tuition|learning/.test(n)) return GraduationCap;
  if (/book|library|read|novel/.test(n)) return BookOpen;
  if (/shopping|cloth|apparel|fashion|outfit|wear/.test(n)) return ShoppingBag;
  if (/entertain|movie|cinema|stream|netflix|prime|ott|show|event/.test(n)) return Tv;
  if (/game|gaming|play/.test(n)) return Gamepad2;
  if (/laptop|computer|tech|device|gadget/.test(n)) return Laptop;
  if (/credit|card|emi|loan|payment/.test(n)) return CreditCard;
  if (/invest|stock|mutual|fund/.test(n)) return TrendingUp;
  if (/meat|chicken|beef|mutton/.test(n)) return Beef;
  if (/fire|emergency|urgent/.test(n)) return Flame;

  return WalletCards;
}

function Budgets() {
  const navigate = useNavigate();

  const [budgets, setBudgets] =
    useState<Budget[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [filterMonth, setFilterMonth] =
    useState(
      String(currentDate.getMonth() + 1)
    );

  const [filterYear, setFilterYear] =
    useState(
      String(currentDate.getFullYear())
    );

  const [showFilterCard, setShowFilterCard] =
    useState(false);

  const [showModal, setShowModal] =
    useState(false);

  const [editingBudget, setEditingBudget] =
    useState<Budget | null>(null);

  const [formData, setFormData] =
    useState<BudgetForm>({
      ...INITIAL_FORM,
    });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [error, setError] =
    useState("");

  const [formError, setFormError] =
    useState("");

  const expenseCategories =
    useMemo(
      () =>
        categories.filter(
          (category) =>
            category.type ===
            "expense"
        ),
      [categories]
    );

  const totalBudget =
    useMemo(
      () =>
        budgets.reduce(
          (total, budget) =>
            total +
            toNumber(
              budget.amount
            ),
          0
        ),
      [budgets]
    );

  const totalSpent = useMemo(
    () =>
      budgets.reduce(
        (total, budget) =>
          total +
          toNumber(
            budget.budgetStatus?.spentAmount
          ),
        0
      ),
    [budgets]
  );

  const exceededBudgets = useMemo(
    () =>
      budgets.filter(
        (budget) =>
          budget.budgetStatus?.exceeded
      ).length,
    [budgets]
  );

  const selectedMonthName =
    MONTHS[
      Math.max(
        0,
        Number(filterMonth) - 1
      )
    ] || "";

  const fetchCategories =
    useCallback(async () => {
      try {
        const response =
          await api.get<CategoriesResponse>(
            "/categories"
          );

        setCategories(
          response.data?.categories ??
            []
        );
      } catch (requestError: unknown) {
        setError(
          getErrorMessage(
            requestError
          )
        );
      }
    }, []);

  const fetchBudgets =
    useCallback(
      async (
        showRefreshing = false,
        isInitial = false
      ) => {
        if (showRefreshing) {
          setRefreshing(true);
        } else if (isInitial) {
          setLoading(true);
        }

        setError("");

        try {
          const response =
            await api.get<BudgetsResponse>(
              "/budgets",
              {
                params: {
                  month:
                    Number(filterMonth),
                  year:
                    Number(filterYear),
                },
              }
            );

          setBudgets(
            response.data?.budgets ??
              []
          );
        } catch (
          requestError: unknown
        ) {
          setError(
            getErrorMessage(
              requestError
            )
          );
        } finally {
          if (showRefreshing) {
            setRefreshing(false);
          } else if (isInitial) {
            setLoading(false);
          }
        }
      },
      [filterMonth, filterYear]
    );

  const isFirstMount = useRef(true);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      void fetchBudgets(false, true);
    } else {
      void fetchBudgets(false, false);
    }
  }, [fetchBudgets]);

  const openCreate = () => {
    setEditingBudget(null);

    setFormData({
      ...INITIAL_FORM,
      month: filterMonth,
      year: filterYear,
    });

    setFormError("");
    setShowModal(true);
  };

  const openEdit = (
    budget: Budget
  ) => {
    setEditingBudget(budget);

    setFormData({
      categoryId:
        String(budget.categoryId),
      amount: String(
        toNumber(budget.amount)
      ),
      month: String(budget.month),
      year: String(budget.year),
    });

    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingBudget(null);
    setFormError("");

    setFormData({
      ...INITIAL_FORM,
    });
  };

  const handleSubmit = async (
    event: unknown
  ) => {
    const formEvent =
      event as {
        preventDefault?: () => void;
      };

    formEvent.preventDefault?.();

    setFormError("");

    const categoryId =
      Number(
        formData.categoryId
      );

    const amount =
      Number(formData.amount);

    const month =
      Number(formData.month);

    const year =
      Number(formData.year);

    if (
      !categoryId ||
      categoryId <= 0
    ) {
      setFormError(
        "Please select an expense category."
      );
      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setFormError(
        "Budget amount must be greater than 0."
      );
      return;
    }

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      setFormError(
        "Please select a valid month."
      );
      return;
    }

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      setFormError(
        "Please enter a valid year between 2000 and 2100."
      );
      return;
    }

    const category =
      expenseCategories.find(
        (item) =>
          item.id === categoryId
      );

    if (!category) {
      setFormError(
        "Please select a valid expense category."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        categoryId,
        amount,
        month,
        year,
      };

      if (editingBudget) {
        await api.put(
          `/budgets/${editingBudget.id}`,
          payload
        );
      } else {
        await api.post(
          "/budgets",
          payload
        );
      }

      setShowModal(false);
      setEditingBudget(null);
      setFormError("");

      setFilterMonth(
        String(month)
      );

      setFilterYear(
        String(year)
      );

      setFormData({
        ...INITIAL_FORM,
        month: String(month),
        year: String(year),
      });

      await fetchBudgets(true);
    } catch (
      requestError: unknown
    ) {
      setFormError(
        getErrorMessage(
          requestError
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (
    budget: Budget
  ) => {
    const categoryName =
      budget.category?.name ||
      "this category";

    const confirmed =
      browserConfirm(
        `Delete the ${categoryName} budget for ${MONTHS[budget.month - 1]} ${budget.year}?`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(budget.id);
    setError("");

    try {
      await api.delete(
        `/budgets/${budget.id}`
      );

      setBudgets(
        (current) =>
          current.filter(
            (item) =>
              item.id !== budget.id
          )
      );
    } catch (
      requestError: unknown
    ) {
      setError(
        getErrorMessage(
          requestError
        )
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      fetchCategories(),
      fetchBudgets(true),
    ]);
  };

  const expenseCategoryOptions: SelectOption[] = useMemo(() => [
    { value: "", label: "Select expense category" },
    ...expenseCategories.map((cat) => ({
      value: String(cat.id),
      label: cat.name,
    })),
  ], [expenseCategories]);

  return (
    <>
      <main className="dashboard-page">
        <div className="dashboard-container">
          <header className="dashboard-header">
            <div>
              <p className="eyebrow">
                Finance Management
              </p>

              <h1>Budgets</h1>

              <p className="page-subtitle">
                Set and manage monthly spending limits for your expense categories.
              </p>
            </div>

            <div className="header-actions">
              <button
                type="button"
                className="header-filter-btn"
                onClick={() => setShowFilterCard((prev) => !prev)}
                aria-label="Filter by month and year"
              >
                <CalendarDays size={14} />
                <span>
                  {selectedMonthName} {filterYear}
                </span>
              </button>

              <button
                type="button"
                className="primary-button compact-btn"
                onClick={openCreate}
                disabled={expenseCategories.length === 0}
              >
                <Plus size={16} />
                Add Budget
              </button>

              {showFilterCard && (
                <>
                  <div
                    className="header-filter-backdrop"
                    onClick={() => setShowFilterCard(false)}
                  />
                  <div className="header-filter-dropdown" style={{ width: 300 }}>
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
                          Select Period
                        </strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowFilterCard(false)}
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
                      <CustomSelect
                        label="Month"
                        value={filterMonth}
                        options={MONTH_OPTIONS}
                        onChange={(val) => setFilterMonth(val)}
                        zIndex={75}
                      />

                      <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                          Year
                        </span>
                        <input
                          type="number"
                          min={2000}
                          max={2100}
                          value={filterYear}
                          onChange={(event) => {
                            setFilterYear(readValue(event));
                          }}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "1px solid #cbd5e1",
                            borderRadius: 12,
                            background: "#fff",
                            color: "#0f172a",
                            fontSize: 13,
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      className="primary-button"
                      style={{ width: "100%", borderRadius: 12 }}
                      onClick={() => setShowFilterCard(false)}
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </header>

          {error && (
            <div
              className="error-alert"
              role="alert"
              style={{
                marginBottom: 20,
              }}
            >
              <span>{error}</span>

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

        {loading ? (
          <Loader message="Loading budgets..." fullScreen={false} />
        ) : (
          <>
            <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-top">
                <p className="stat-label">
                  Total Budget
                </p>
                <div className="stat-icon blue-icon">
                  <WalletCards size={18} />
                </div>
              </div>

              <h2 style={{ color: "#3b5bdb" }} title={formatCurrency(totalBudget)}>
                {formatCurrency(totalBudget)}
              </h2>

              <p className="stat-description" title={`Planned for ${selectedMonthName} ${filterYear}`}>
                Planned for {selectedMonthName} {filterYear}
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <p className="stat-label">
                  Budget Categories
                </p>
                <div className="stat-icon purple-icon">
                  <Target size={18} />
                </div>
              </div>

              <h2 style={{ color: "#0f172a" }} title={String(budgets.length)}>
                {budgets.length}
              </h2>

              <p className="stat-description" title="Active budgeted categories">
                Active budgeted categories
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <p className="stat-label">
                  Total Spent
                </p>
                <div className={`stat-icon ${totalSpent > totalBudget ? "red-icon" : "green-icon"}`}>
                  <WalletCards size={18} />
                </div>
              </div>

              <h2 style={{ color: totalSpent > totalBudget ? "#dc2626" : "#059669" }} title={formatCurrency(totalSpent)}>
                {formatCurrency(totalSpent)}
              </h2>

              <p className="stat-description" title={`Spent in ${selectedMonthName} ${filterYear}`}>
                Spent in {selectedMonthName} {filterYear}
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <p className="stat-label">
                  Budget Alerts
                </p>
                <div className={`stat-icon ${exceededBudgets > 0 ? "red-icon" : "green-icon"}`}>
                  <Target size={18} />
                </div>
              </div>

              <h2 style={{ color: exceededBudgets > 0 ? "#dc2626" : "#059669" }} title={String(exceededBudgets)}>
                {exceededBudgets}
              </h2>

              <p className="stat-description" title="Categories over budget limit">
                Categories over budget limit
              </p>
            </div>

          </section>

          <section className="panel">
            <div
              className="panel-header"
              style={{
                marginBottom: 20,
              }}
            >
              <div>
                <h2>
                  {selectedMonthName}{" "}
                  {filterYear} Budgets
                </h2>

                <p>
                  Manage your planned
                  spending limits.
                </p>
              </div>

              <Target
                size={22}
                className="panel-header-icon"
              />
            </div>

            {expenseCategories.length ===
            0 ? (
              <div
  style={{
    width: "100%",
    minHeight: 220,
    padding: "36px 20px",
    boxSizing: "border-box",

    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",

    gap: 12,

    textAlign: "center",
    background: "#f8fafc",
    borderRadius: 14,
  }}
>
  {/* Icon */}
  <div
    style={{
      width: 52,
      height: 52,
      borderRadius: 14,

      display: "flex",
      alignItems: "center",
      justifyContent: "center",

      background: "#eaedff",
      color: "#3b5bdb",

      marginBottom: 2,
    }}
  >
    <Target size={26} />
  </div>

  {/* Title */}
  <div
    style={{
      color: "#0f172a",
      fontSize: 15,
      fontWeight: 700,
      lineHeight: 1.4,
    }}
  >
    No expense categories found
  </div>

  {/* Description */}
  <div
    style={{
      maxWidth: 440,
      color: "#64748b",
      fontSize: 13,
      lineHeight: 1.5,
    }}
  >
    Create an expense category first before adding a budget.
  </div>

  {/* Button */}
  <button
    type="button"
    className="primary-button"
    onClick={() => navigate("/categories")}
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",

      gap: 7,

      minHeight: 42,
      padding: "0 20px",

      marginTop: 4,

      whiteSpace: "nowrap",
      flexShrink: 0,
    }}
  >
    <Target size={16} />
    Manage Categories
  </button>
</div>
              
            ) : budgets.length ===
              0 ? (
              <div
  className="empty-state"
  style={{
    padding: "45px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    flexWrap: "wrap",
  }}
>
  <Target
    size={38}
    style={{
      opacity: 0.5,
      flexShrink: 0,
    }}
  />

  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
      lineHeight: 1.4,
    }}
  >
    <span
      style={{
        fontWeight: 700,
      }}
    >
      No budgets for this month
    </span>

    <span>
      Create your first budget for{" "}
      {selectedMonthName}{" "}
      {filterYear}.
    </span>
  </div>

  <button
    type="button"
    className="primary-button"
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      marginTop: 0,
      flexShrink: 0,
    }}
    onClick={openCreate}
  >
    <Plus size={17} />
    Add Budget
  </button>
</div>
            ) : (
              <div className="budgets-grid">
                {budgets.map((budget) => {
                  const catName = budget.category?.name ?? "";
                  const CategoryIcon = getCategoryIcon(catName);
                  const pct = budget.budgetStatus?.percentageUsed ?? 0;
                  const exceeded = Boolean(budget.budgetStatus?.exceeded);

                  const borderColor = exceeded
                    ? "rgba(239,68,68,0.30)"
                    : pct >= 80
                    ? "rgba(249,115,22,0.28)"
                    : "rgba(186, 215, 245,0.5)";

                  const borderWidth = "1px";

                  return (
                    <div
                      key={budget.id}
                      style={{
                        border: `${borderWidth} solid ${borderColor}`,
                        borderRadius: 14,
                        padding: 20,
                        background: "#ffffff",
                        boxShadow: "0 2px 12px rgba(59, 91, 219, 0.07), 0 0 0 1px rgba(186, 215, 245,0.4)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 12,
                          marginBottom: 18,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 11,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 11,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "#eaedff",
                              color: "#3b5bdb",
                              flexShrink: 0,
                            }}
                          >
                            <CategoryIcon size={19} />
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <h3
                              style={{
                                margin: 0,
                                fontSize: 15,
                                fontWeight: 700,
                                color: "#0f172a",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {budget.category?.name || "Category"}
                            </h3>

                            <p
                              style={{
                                margin: "4px 0 0",
                                fontSize: 12,
                                color: "#64748b",
                              }}
                            >
                              {MONTHS[budget.month - 1]} {budget.year}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 5 }}>
                          <button
                            type="button"
                            title="Edit budget"
                            onClick={() => openEdit(budget)}
                            style={{
                              width: 34,
                              height: 34,
                              border: "none",
                              borderRadius: 8,
                              background: "#eaedff",
                              color: "#3b5bdb",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            title="Delete budget"
                            disabled={deletingId === budget.id}
                            onClick={() => {
                              void handleDelete(budget);
                            }}
                            style={{
                              width: 34,
                              height: 34,
                              border: "none",
                              borderRadius: 8,
                              background: "rgba(239, 68, 68, 0.08)",
                              color: "#dc2626",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: deletingId === budget.id ? "not-allowed" : "pointer",
                              opacity: deletingId === budget.id ? 0.5 : 1,
                            }}
                          >
                            {deletingId === budget.id ? (
                              <RefreshCw size={16} className="spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          borderTop: "1px solid rgba(186, 215, 245,0.4)",
                          paddingTop: 16,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 16,
                            alignItems: "flex-start",
                            marginBottom: 12,
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p
                              style={{
                                margin: "0 0 6px",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#6b7a9f",
                              }}
                            >
                              Spent / Monthly Limit
                            </p>

                            <strong
                              style={{
                                display: "block",
                                fontSize: 15,
                                lineHeight: 1.2,
                                fontWeight: 700,
                                color: exceeded ? "#dc2626" : "#3b5bdb",
                              }}
                            >
                              {formatCurrency(budget.budgetStatus?.spentAmount ?? 0)}
                              <span
                                style={{
                                  color: "#94a3b8",
                                  fontWeight: 500,
                                  fontSize: 14,
                                }}
                              >
                                {" / "}
                                {formatCurrency(budget.amount)}
                              </span>
                            </strong>
                          </div>

                          <span
                            style={{
                              flexShrink: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: 72,
                              minHeight: 30,
                              padding: "5px 10px",
                              boxSizing: "border-box",
                              borderRadius: 999,
                              fontSize: 11,
                              lineHeight: 1.15,
                              fontWeight: 700,
                              textAlign: "center",
                              letterSpacing: "0.3px",
                              color: exceeded
                                ? "#b91c1c"
                                : pct >= 80
                                ? "#92400e"
                                : "#065f46",
                              background: exceeded
                                ? "#fef2f2"
                                : pct >= 80
                                ? "#fffbeb"
                                : "#f0fdf4",
                              border: `1px solid ${
                                exceeded
                                  ? "rgba(239,68,68,0.25)"
                                  : pct >= 80
                                  ? "rgba(217,119,6,0.25)"
                                  : "rgba(16,185,129,0.25)"
                              }`,
                            }}
                          >
                            {exceeded ? (
                              <>
                                <span>Over</span>
                                <span>&nbsp;Budget</span>
                              </>
                            ) : (
                              `${Math.round(pct)}% Used`
                            )}
                          </span>
                        </div>

                        <div
                          style={{
                            height: 6,
                            borderRadius: 999,
                            background: "#e8ecff",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              height: "100%",
                              borderRadius: 999,
                              background: exceeded
                                ? "#f87171"
                                : pct >= 80
                                ? "#fb923c"
                                : "#3b5bdb",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>

                        <p
                          style={{
                            margin: "9px 0 0",
                            fontSize: 12,
                            fontWeight: 500,
                            color: exceeded ? "#ef4444" : "#6b7a9f",
                          }}
                        >
                          {exceeded
                            ? `Exceeded by ${formatCurrency(budget.budgetStatus?.exceededBy ?? 0)}`
                            : `${formatCurrency(Math.max(budget.budgetStatus?.remainingAmount ?? 0, 0))} remaining`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          </>
        )}
        </div>
      </main>


      {showModal && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            const value =
              event as unknown as {
                target?: unknown;
                currentTarget?: unknown;
              };

            if (
              value.target ===
              value.currentTarget
            ) {
              closeModal();
            }
          }}
          onTouchEnd={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background:
              "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: 20,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="budget-modal-title"
            style={{
              width: "100%",
              maxWidth: 520,
              background:
                "#ffffff",
              borderRadius: 18,
              boxShadow:
                "0 25px 70px rgba(15, 23, 42, 0.22)",
              overflow:
                "hidden",
            }}
          >
            <div
              style={{
                padding:
                  "20px 22px",
                borderBottom:
                  "1px solid #eef2f7",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: 12,
              }}
            >
              <div>
                <h2
                  id="budget-modal-title"
                  style={{
                    margin: 0,
                    fontSize: 20,
                    color:
                      "#0f172a",
                  }}
                >
                  {editingBudget
                    ? "Edit Budget"
                    : "Add Budget"}
                </h2>

                <p
                  style={{
                    margin:
                      "5px 0 0",
                    fontSize: 13,
                    color:
                      "#64748b",
                  }}
                >
                  Set a spending
                  limit for an
                  expense category.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={saving}
                aria-label="Close"
                style={{
                  width: 36,
                  height: 36,
                  border: "none",
                  borderRadius: 9,
                  background:
                    "#f8fafc",
                  color:
                    "#475569",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  cursor: saving
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
            >
              <div
                style={{
                  padding: 22,
                  display:
                    "grid",
                  gap: 17,
                }}
              >
                {formError && (
                  <div
                    role="alert"
                    style={{
                      padding:
                        "11px 13px",
                      borderRadius:
                        9,
                      background:
                        "rgba(239, 68, 68, 0.08)",
                      border:
                        "1px solid rgba(239, 68, 68, 0.18)",
                      color:
                        "#b91c1c",
                      fontSize: 13,
                      fontWeight:
                        600,
                    }}
                  >
                    {formError}
                  </div>
                )}

                <div style={{ display: "grid", gap: 7 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#334155",
                    }}
                  >
                    Expense Category
                  </span>
                  <CustomSelect
                    value={formData.categoryId}
                    options={expenseCategoryOptions}
                    placeholder="Select expense category"
                    onChange={(val) =>
                      setFormData((current) => ({
                        ...current,
                        categoryId: val,
                      }))
                    }
                    disabled={saving}
                    minHeight={46}
                    borderRadius={10}
                    zIndex={1200}
                  />
                </div>

                <label
                  style={{
                    display:
                      "grid",
                    gap: 7,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight:
                        700,
                      color:
                        "#334155",
                    }}
                  >
                    Monthly Budget
                    Amount
                  </span>

                  <div
                    style={{
                      position:
                        "relative",
                    }}
                  >
                    <span
                      style={{
                        position:
                          "absolute",
                        left: 13,
                        top: "50%",
                        transform:
                          "translateY(-50%)",
                        fontWeight:
                          700,
                        color:
                          "#64748b",
                      }}
                    >
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="5000"
                      value={
                        formData.amount
                      }
                      onChange={(
                        event
                      ) =>
                        setFormData(
                          (current) => ({
                            ...current,
                            amount:
                              readValue(
                                event
                              ),
                          })
                        )
                      }
                      disabled={saving}
                      style={{
                        width:
                          "100%",
                        boxSizing:
                          "border-box",
                        padding:
                          "12px 13px 12px 32px",
                        border:
                          "1px solid #dbe3ee",
                        borderRadius:
                          10,
                        background:
                          "#fff",
                        color:
                          "#0f172a",
                        fontSize: 14,
                        outline:
                          "none",
                      }}
                    />
                  </div>
                </label>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: 14,
                  }}
                >
                  <div style={{ display: "grid", gap: 7 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#334155",
                      }}
                    >
                      Month
                    </span>
                    <CustomSelect
                      value={formData.month}
                      options={MONTH_OPTIONS}
                      onChange={(val) =>
                        setFormData((current) => ({
                          ...current,
                          month: val,
                        }))
                      }
                      disabled={saving}
                      minHeight={46}
                      borderRadius={10}
                      zIndex={1150}
                    />
                  </div>

                  <label
                    style={{
                      display:
                        "grid",
                      gap: 7,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight:
                          700,
                        color:
                          "#334155",
                      }}
                    >
                      Year
                    </span>

                    <input
                      type="number"
                      min={2000}
                      max={2100}
                      value={
                        formData.year
                      }
                      onChange={(
                        event
                      ) =>
                        setFormData(
                          (current) => ({
                            ...current,
                            year:
                              readValue(
                                event
                              ),
                          })
                        )
                      }
                      disabled={saving}
                      style={{
                        width:
                          "100%",
                        boxSizing:
                          "border-box",
                        padding:
                          "12px 13px",
                        border:
                          "1px solid #dbe3ee",
                        borderRadius:
                          10,
                        background:
                          "#fff",
                        color:
                          "#0f172a",
                        fontSize: 14,
                        outline:
                          "none",
                      }}
                    />
                  </label>
                </div>
              </div>

              <div
                style={{
                  padding:
                    "16px 22px 20px",
                  borderTop:
                    "1px solid #eef2f7",
                  display:
                    "flex",
                  justifyContent:
                    "flex-end",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  className="secondary-button"
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
                        size={16}
                        className="spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Target
                        size={16}
                      />
                      {editingBudget
                        ? "Update Budget"
                        : "Create Budget"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default Budgets;
