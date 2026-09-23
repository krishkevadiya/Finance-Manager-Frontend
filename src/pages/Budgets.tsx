import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  Edit3,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import api from "../api/axios";

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
        showRefreshing = false
      ) => {
        if (showRefreshing) {
          setRefreshing(true);
        } else {
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
          } else {
            setLoading(false);
          }
        }
      },
      [filterMonth, filterYear]
    );

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    void fetchBudgets();
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

  if (loading) {
    return (
      <main className="dashboard-loading">
        <div className="loading-box">
          <RefreshCw
            size={22}
            className="spin"
          />

          <span>
            Loading budgets...
          </span>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="dashboard-page">
        <div className="dashboard-container">
          <header className="dashboard-header">
            <div>
              <button
                type="button"
                className="back-button"
                onClick={() =>
                  navigate(
                    "/dashboard"
                  )
                }
              >
                <ArrowLeft
                  size={17}
                />
                Back to Dashboard
              </button>

              <p className="eyebrow">
                Finance Management
              </p>

              <h1>Budgets</h1>

              <p className="page-subtitle">
                Set and manage monthly
                spending limits for
                your expense
                categories.
              </p>
            </div>

            <div className="header-actions">
              
              <button
                type="button"
                className="primary-button"
                onClick={openCreate}
                disabled={
                  expenseCategories.length ===
                  0
                }
              >
                <Plus size={18} />
                Add Budget
              </button>
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

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>
                    Filter Budgets
                  </h2>

                  <p>
                    Filter budgets by month and year.
                  </p>
              </div>

              <CalendarDays
                size={22}
                className="panel-header-icon"
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(180px, 1fr) minmax(140px, 180px)",
                gap: 14,
                alignItems: "end",
              }}
            >
              <label
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: 7,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color:
                      "#475569",
                  }}
                >
                  Month
                </span>

                <select
                  value={filterMonth}
                  onChange={(event) =>
                    setFilterMonth(
                      readValue(event)
                    )
                  }
                  style={{
                    width:
                      "100%",
                    padding:
                      "12px 14px",
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
                >
                  {MONTHS.map(
                    (
                      month,
                      index
                    ) => (
                      <option
                        key={month}
                        value={
                          index + 1
                        }
                      >
                        {month}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: 7,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color:
                      "#475569",
                  }}
                >
                  Year
                </span>

                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={filterYear}
                  onChange={(event) =>
                    setFilterYear(
                      readValue(event)
                    )
                  }
                  style={{
                    width:
                      "100%",
                    padding:
                      "12px 14px",
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
                    boxSizing:
                      "border-box",
                  }}
                />
              </label>
            </div>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-top">
                <div>
                  <p className="stat-label">
                    Total Budget
                  </p>

                  <h2
                    style={{
                      color: "#2563eb",
                    }}
                  >
                    {formatCurrency(
                      totalBudget
                    )}
                  </h2>
                </div>

                <div className="stat-icon">
                  <WalletCards
                    size={21}
                  />
                </div>
              </div>

              <p className="stat-description">
                Planned spending for{" "}
                {selectedMonthName}{" "}
                {filterYear}
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <div>
                  <p className="stat-label">
                    Budget Categories
                  </p>

                  <h2
                    style={{
                      color: "#0f172a",
                    }}
                  >
                    {budgets.length}
                  </h2>
                </div>

                <div className="stat-icon">
                  <Target size={21} />
                </div>
              </div>

              <p className="stat-description">
                Expense categories
                with budgets
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <div>
                  <p className="stat-label">
                    Total Spent
                  </p>

                  <h2
                    style={{
                      color: exceededBudgets > 0 ? "#dc2626" : "#059669",
                    }}
                  >
                    {formatCurrency(totalSpent)}
                  </h2>
                </div>

                <div className="stat-icon">
                  <WalletCards size={21} />
                </div>
              </div>

              <p className="stat-description">
                Actual expense spending for {selectedMonthName} {filterYear}
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <div>
                  <p className="stat-label">
                    Budget Alerts
                  </p>

                  <h2
                    style={{
                      color: exceededBudgets > 0 ? "#dc2626" : "#059669",
                    }}
                  >
                    {exceededBudgets}
                  </h2>
                </div>

                <div className="stat-icon">
                  <Target size={21} />
                </div>
              </div>

              <p className="stat-description">
                Categories currently over budget
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
                className="empty-state"
                style={{
                  padding:
                    "45px 20px",
                }}
              >
                <Target
                  size={38}
                  style={{
                    marginBottom: 12,
                    opacity: 0.5,
                  }}
                />

                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  No expense
                  categories found
                </div>

                <div>
                  Create an expense
                  category first
                  before adding a
                  budget.
                </div>

                <button
                  type="button"
                  className="primary-button"
                  style={{
                    marginTop: 18,
                  }}
                  onClick={() =>
                    navigate(
                      "/categories"
                    )
                  }
                >
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
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {budgets.map(
                  (budget) => (
                    <div
                      key={budget.id}
                      style={{
                        border:
                          "1px solid #e2e8f0",
                        borderRadius:
                          14,
                        padding: 20,
                        background:
                          "#ffffff",
                        boxShadow:
                          "0 4px 14px rgba(15, 23, 42, 0.04)",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "flex-start",
                          gap: 12,
                          marginBottom:
                            18,
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 11,
                            minWidth:
                              0,
                          }}
                        >
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius:
                                11,
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              background:
                                "rgba(37, 99, 235, 0.10)",
                              color:
                                "#2563eb",
                              flexShrink:
                                0,
                            }}
                          >
                            <Target
                              size={19}
                            />
                          </div>

                          <div
                            style={{
                              minWidth:
                                0,
                            }}
                          >
                            <h3
                              style={{
                                margin: 0,
                                fontSize: 16,
                                fontWeight: 750,
                                color: "#0f172a",
                                overflow:
                                  "hidden",
                                textOverflow:
                                  "ellipsis",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {budget
                                .category
                                ?.name ||
                                "Category"}
                            </h3>

                            <p
                              style={{
                                margin:
                                  "4px 0 0",
                                fontSize:
                                  12,
                                color:
                                  "#64748b",
                              }}
                            >
                              {
                                MONTHS[
                                  budget
                                    .month -
                                    1
                                ]
                              }{" "}
                              {
                                budget.year
                              }
                            </p>
                          </div>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            gap: 5,
                          }}
                        >
                          <button
                            type="button"
                            title="Edit budget"
                            onClick={() =>
                              openEdit(
                                budget
                              )
                            }
                            style={{
                              width: 34,
                              height: 34,
                              border:
                                "none",
                              borderRadius:
                                8,
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
                              cursor:
                                "pointer",
                            }}
                          >
                            <Edit3
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            title="Delete budget"
                            disabled={
                              deletingId ===
                              budget.id
                            }
                            onClick={() => {
                              void handleDelete(
                                budget
                              );
                            }}
                            style={{
                              width: 34,
                              height: 34,
                              border:
                                "none",
                              borderRadius:
                                8,
                              background:
                                "rgba(239, 68, 68, 0.08)",
                              color:
                                "#dc2626",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              cursor:
                                deletingId ===
                                budget.id
                                  ? "not-allowed"
                                  : "pointer",
                              opacity:
                                deletingId ===
                                budget.id
                                  ? 0.5
                                  : 1,
                            }}
                          >
                            {deletingId ===
                            budget.id ? (
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
                      </div>

                      <div
                        style={{
                          borderTop:
                            "1px solid #eef2f7",
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
  <div
    style={{
      minWidth: 0,
      flex: 1,
    }}
  >
    <p
      style={{
        margin: "0 0 6px",
        fontSize: 12,
        fontWeight: 650,
        color: "#64748b",
      }}
    >
      Spent / Monthly Limit
    </p>

    <strong
      style={{
        display: "block",
        fontSize: 22,
        lineHeight: 1.2,
        fontWeight: 800,
        color: budget.budgetStatus?.exceeded
          ? "#dc2626"
          : "#2563eb",
      }}
    >
      {formatCurrency(
        budget.budgetStatus?.spentAmount ?? 0
      )}

      <span
        style={{
          color: "#94a3b8",
          fontWeight: 600,
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

      minWidth: 78,
      minHeight: 34,
      padding: "6px 10px",

      boxSizing: "border-box",

      borderRadius: 10,

      fontSize: 11,
      lineHeight: 1.15,
      fontWeight: 800,
      textAlign: "center",
      letterSpacing: "0.1px",

      color: budget.budgetStatus?.exceeded
        ? "#b91c1c"
        : "#047857",

      background: budget.budgetStatus?.exceeded
        ? "#fff1f2"
        : "#ecfdf5",

      border: `1px solid ${
        budget.budgetStatus?.exceeded
          ? "#fecdd3"
          : "#a7f3d0"
      }`,
    }}
  >
    {budget.budgetStatus?.exceeded ? (
      <>
        <span>Over</span>
        <span>&nbsp;Budget</span>
      </>
    ) : (
      `${Math.round(
        budget.budgetStatus?.percentageUsed ?? 0
      )}% Used`
    )}
  </span>
</div>

                        <div
                          style={{
                            height: 8,
                            borderRadius: 999,
                            background: "#e2e8f0",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(budget.budgetStatus?.percentageUsed ?? 0, 100)}%`,
                              height: "100%",
                              borderRadius: 999,
                              background: budget.budgetStatus?.exceeded ? "#dc2626" : "#2563eb",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>

                        <p
                          style={{
                            margin: "9px 0 0",
                            fontSize: 12,
                            fontWeight: 650,
                            color: budget.budgetStatus?.exceeded ? "#b91c1c" : "#64748b",
                          }}
                        >
                          {budget.budgetStatus?.exceeded
                            ? `Exceeded by ${formatCurrency(budget.budgetStatus.exceededBy)}`
                            : `${formatCurrency(Math.max(budget.budgetStatus?.remainingAmount ?? 0, 0))} remaining`}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
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
                    Expense Category
                  </span>

                  <select
                    value={
                      formData.categoryId
                    }
                    onChange={(
                      event
                    ) =>
                      setFormData(
                        (current) => ({
                          ...current,
                          categoryId:
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
                  >
                    <option value="">
                      Select expense
                      category
                    </option>

                    {expenseCategories.map(
                      (
                        category
                      ) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>

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
                      Month
                    </span>

                    <select
                      value={
                        formData.month
                      }
                      onChange={(
                        event
                      ) =>
                        setFormData(
                          (current) => ({
                            ...current,
                            month:
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
                    >
                      {MONTHS.map(
                        (
                          month,
                          index
                        ) => (
                          <option
                            key={
                              month
                            }
                            value={
                              index +
                              1
                            }
                          >
                            {month}
                          </option>
                        )
                      )}
                    </select>
                  </label>

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