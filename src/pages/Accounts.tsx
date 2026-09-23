import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Edit3,
  Landmark,
  MoreVertical,
  Plus,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

type AccountType =
  | "cash"
  | "bank"
  | "credit_card"
  | "investment"
  | "other";

interface Account {
  id: number;
  name: string;
  type: AccountType;
  balance: number | string;
  currency: string;
  createdAt?: string;
}

interface AccountsResponse {
  accounts?: Account[];
}

interface AccountResponse {
  message?: string;
  account: Account;
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

interface AccountFormData {
  name: string;
  type: AccountType;
  balance: string;
  currency: string;
}

const INITIAL_FORM: AccountFormData = {
  name: "",
  type: "cash",
  balance: "0",
  currency: "INR",
};

const ACCOUNT_TYPES: AccountType[] = [
  "cash",
  "bank",
  "credit_card",
  "investment",
  "other",
];

const ACCOUNT_TYPE_LABELS: Record<
  AccountType,
  string
> = {
  cash: "Cash",
  bank: "Bank",
  credit_card: "Credit Card",
  investment: "Investment",
  other: "Other",
};

function toNumber(
  value: number | string | undefined | null
): number {
  const result = Number(value ?? 0);

  return Number.isFinite(result)
    ? result
    : 0;
}

function formatCurrency(
  value: number | string | undefined | null,
  currency = "INR"
): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(toNumber(value));
  } catch {
    return `₹${toNumber(value).toFixed(2)}`;
  }
}

function getErrorMessage(
  error: unknown
): string {
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
      "Something went wrong. Please try again."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function getAccountIcon(
  type: AccountType
) {
  switch (type) {
    case "bank":
      return <Landmark size={21} />;

    case "credit_card":
      return <CreditCard size={21} />;

    case "investment":
      return <TrendingUp size={21} />;

    case "other":
      return <MoreVertical size={21} />;

    case "cash":
    default:
      return <Wallet size={21} />;
  }
}

function getEventValue(
  event: unknown
): string {
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
}

function Accounts() {
  const navigate = useNavigate();

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [editingAccount, setEditingAccount] =
    useState<Account | null>(null);

  const [formData, setFormData] =
    useState<AccountFormData>({
      ...INITIAL_FORM,
    });

  const [formError, setFormError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<Account | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] =
    useState<AccountType | "">("");

  /*
   * GET ACCOUNTS
   */
  const fetchAccounts =
    useCallback(async () => {
      try {
        setError("");

        const response =
          await api.get<AccountsResponse>(
            "/accounts"
          );

        const receivedAccounts =
          response.data?.accounts;

        setAccounts(
          Array.isArray(receivedAccounts)
            ? receivedAccounts
            : []
        );
      } catch (requestError: unknown) {
        setError(
          getErrorMessage(requestError)
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  /*
   * INITIAL LOAD
   */
  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  /*
   * TOTAL BALANCE
   */
  const totalBalance = useMemo(() => {
    return accounts.reduce(
      (total, account) =>
        total + toNumber(account.balance),
      0
    );
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLowerCase();

    return accounts.filter((account) => {
      const matchesType =
        !typeFilter ||
        account.type === typeFilter;

      const matchesSearch =
        !normalizedSearch ||
        account.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        ACCOUNT_TYPE_LABELS[account.type]
          .toLowerCase()
          .includes(normalizedSearch) ||
        account.currency
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesType && matchesSearch;
    });
  }, [accounts, searchTerm, typeFilter]);

  const accountTypeCounts = useMemo(() => {
    return ACCOUNT_TYPES.reduce(
      (result, type) => {
        result[type] = accounts.filter(
          (account) => account.type === type
        ).length;
        return result;
      },
      {} as Record<AccountType, number>
    );
  }, [accounts]);

  /*
   * OPEN CREATE MODAL
   */
  const openCreateModal = () => {
    setEditingAccount(null);

    setFormData({
      ...INITIAL_FORM,
    });

    setFormError("");
    setIsModalOpen(true);
  };

  /*
   * OPEN EDIT MODAL
   */
  const openEditModal = (
    account: Account
  ) => {
    setEditingAccount(account);

    setFormData({
      name: account.name,
      type: account.type,
      balance: String(
        account.balance ?? 0
      ),
      currency:
        account.currency || "INR",
    });

    setFormError("");
    setIsModalOpen(true);
  };

  /*
   * CLOSE MODAL
   */
  const closeModal = () => {
    if (saving) {
      return;
    }

    setIsModalOpen(false);
    setEditingAccount(null);

    setFormData({
      ...INITIAL_FORM,
    });

    setFormError("");
  };

  /*
   * FORM UPDATE
   */
  const updateFormField = (
    field: keyof AccountFormData,
    event: unknown
  ) => {
    const value =
      getEventValue(event);

    setFormData((previous) => ({
      ...previous,
      [field]:
        field === "currency"
          ? value.toUpperCase()
          : value,
    }));
  };

  /*
   * CREATE / UPDATE
   */
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

    const name =
      formData.name.trim();

    const balance =
      Number(formData.balance);

    const currency =
      formData.currency
        .trim()
        .toUpperCase();

    /*
     * NAME VALIDATION
     */
    if (
      name.length < 2 ||
      name.length > 100
    ) {
      setFormError(
        "Account name must be between 2 and 100 characters."
      );

      return;
    }

    /*
     * BALANCE VALIDATION
     */
    if (
      !Number.isFinite(balance) ||
      balance < 0
    ) {
      setFormError(
        "Balance must be a valid number greater than or equal to 0."
      );

      return;
    }

    /*
     * CURRENCY VALIDATION
     */
    if (
      !/^[A-Z]{3}$/.test(currency)
    ) {
      setFormError(
        "Currency must be a 3-letter uppercase code, such as INR."
      );

      return;
    }

    setSaving(true);

    const payload = {
      name,
      type: formData.type,
      balance,
      currency,
    };

    try {
      if (editingAccount) {
        await api.put<AccountResponse>(
          `/accounts/${editingAccount.id}`,
          payload
        );
      } else {
        await api.post<AccountResponse>(
          "/accounts",
          payload
        );
      }

      setIsModalOpen(false);
      setEditingAccount(null);

      setFormData({
        ...INITIAL_FORM,
      });

      setFormError("");

      await fetchAccounts();
    } catch (requestError: unknown) {
      setFormError(
        getErrorMessage(requestError)
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * OPEN DELETE CONFIRMATION
   *
   * No window/globalThis usage.
   */
  const openDeleteConfirmation = (
    account: Account
  ) => {
    setDeleteTarget(account);
  };

  /*
   * CANCEL DELETE
   */
  const cancelDelete = () => {
    if (deletingId !== null) {
      return;
    }

    setDeleteTarget(null);
  };

  /*
   * DELETE ACCOUNT
   */
  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    const accountId =
      deleteTarget.id;

    setDeletingId(accountId);
    setError("");

    try {
      await api.delete(
        `/accounts/${accountId}`
      );

      setAccounts((previous) =>
        previous.filter(
          (account) =>
            account.id !== accountId
        )
      );

      setDeleteTarget(null);
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(requestError)
      );
    } finally {
      setDeletingId(null);
    }
  };

  /*
   * REFRESH
   */
  const handleRefresh = () => {
    setRefreshing(true);

    void fetchAccounts();
  };

  /*
   * LOADING
   */
  if (loading) {
    return (
      <main className="dashboard-loading">
        <div className="loading-box">
          <RefreshCw
            size={22}
            className="loading-icon"
          />

          <span>
            Loading accounts...
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">

        {/* HEADER */}

        <header className="dashboard-header accounts-header">

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
              <ArrowLeft size={17} />

              Back to Dashboard
            </button>

            <p className="eyebrow">
              Finance Management
            </p>

            <h1>
              Accounts
            </h1>

            <p className="page-subtitle">
              Manage your financial
              accounts and balances
            </p>

          </div>

          <div className="header-actions">


            <button
              type="button"
              className="primary-button"
              onClick={
                openCreateModal
              }
            >
              <Plus size={18} />

              Add Account
            </button>

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
              onClick={
                handleRefresh
              }
              className="error-button"
            >
              Try again
            </button>
          </div>
        )}

        {/* ACCOUNT FILTERS */} 
 
            <section className="panel"> 
              <div className="panel-header"> 
                <div> 
                  <h2>Find an Account</h2> 
                  <p> 
                    Search and filter your accounts 
                  </p> 
                </div> 
 
                <SlidersHorizontal 
                  size={21} 
                  className="panel-header-icon" 
                /> 
              </div> 
 
              <div 
                style={{ 
                  display: "grid", 
                  gridTemplateColumns: 
                    "minmax(220px, 1fr) minmax(180px, 240px)", 
                  gap: 14, 
                  alignItems: "end", 
                }} 
              > 
                <div className="form-field"> 
                  <label htmlFor="account-search"> 
                    Search 
                  </label> 
 
                  <div 
                    style={{ 
                      position: "relative", 
                    }} 
                  > 
                    <Search 
                      size={17} 
                      style={{ 
                        position: "absolute", 
                        left: 13, 
                        top: "50%", 
                        transform: "translateY(-50%)", 
                        color: "#94a3b8", 
                        pointerEvents: "none", 
                      }} 
                    /> 
 
                    <input 
                      id="account-search" 
                      type="text" 
                      value={searchTerm} 
                      onChange={(event) => 
                        setSearchTerm( 
                          getEventValue(event) 
                        ) 
                      } 
                      placeholder="Search by account name, type..." 
                      style={{ 
                        paddingLeft: 40, 
                      }} 
                    /> 
                  </div> 
                </div> 
 
                <div className="form-field"> 
                  <label htmlFor="account-type-filter"> 
                    Account Type 
                  </label> 
 
                  <select 
                    id="account-type-filter" 
                    value={typeFilter} 
                    onChange={(event) => { 
                      const value = 
                        getEventValue(event); 
 
                      setTypeFilter( 
                        value as AccountType | "" 
                      ); 
                    }} 
                  > 
                    <option value=""> 
                      All Types 
                    </option> 
 
                    {ACCOUNT_TYPES.map((type) => ( 
                      <option 
                        key={type} 
                        value={type} 
                      > 
                        {ACCOUNT_TYPE_LABELS[type]} ( 
                        {accountTypeCounts[type]}) 
                      </option> 
                    ))} 
                  </select> 
                </div> 
              </div> 
 
              {(searchTerm || typeFilter) && ( 
                <div 
                  style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    gap: 12, 
                    flexWrap: "wrap", 
                    marginTop: 14, 
                  }} 
                > 
                  <span 
                    style={{ 
                      fontSize: 13, 
                      color: "#64748b", 
                    }} 
                  > 
                    Showing {filteredAccounts.length} of{" "} 
                    {accounts.length} accounts 
                  </span> 
 
                  <button 
                    type="button" 
                    className="secondary-button" 
                    onClick={() => { 
                      setSearchTerm(""); 
                      setTypeFilter(""); 
                    }} 
                  > 
                    Clear Filters 
                  </button> 
                </div> 
              )} 
            </section>

        {/* TOTAL BALANCE */}

        <section className="account-summary-card">

          <div className="account-summary-icon">
            <Wallet size={25} />
          </div>

          <div>

            <p>
              Total Account Balance
            </p>

            <h2 className="account-total-balance">
  {formatCurrency(
    totalBalance
  )}
</h2>

            <span>
              {accounts.length}{" "}
              {accounts.length === 1
                ? "account"
                : "accounts"}{" "}
              connected
            </span>

          </div>

        </section>

        {/* NO ACCOUNTS */}

        {accounts.length === 0 ? (

          <section className="empty-accounts-card">

            <div className="empty-accounts-icon">
              <Wallet size={30} />
            </div>

            <h2>
              No accounts yet
            </h2>

            <p>
              Add your first account
              to start tracking your
              finances.
            </p>

            <button
              type="button"
              className="primary-button"
              onClick={
                openCreateModal
              }
            >
              <Plus size={18} />

              Add Your First Account
            </button>

          </section>

        ) : (

          <>
            
            {filteredAccounts.length === 0 ? (
              <section className="empty-accounts-card">
                <div className="empty-accounts-icon">
                  <Search size={30} />
                </div>

                <h2>No matching accounts</h2>

                <p>
                  Try a different search term or account
                  type.
                </p>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("");
                  }}
                >
                  Clear Filters
                </button>
              </section>
            ) : (
              /* ACCOUNT LIST */

              <section className="accounts-grid">

                {filteredAccounts.map(
                  (account) => (

                    <article
                      className="account-card"
                      key={account.id}
                    >

                  <div className="account-card-header">

                    <div className="account-card-icon">
                      {getAccountIcon(
                        account.type
                      )}
                    </div>

                    <div className="account-card-actions">

                      <button
                        type="button"
                        className="icon-button"
                        title="Edit account"
                        onClick={() =>
                          openEditModal(
                            account
                          )
                        }
                      >
                        <Edit3
                          size={17}
                        />
                      </button>

                      <button
                        type="button"
                        className="icon-button delete-icon-button"
                        title="Delete account"
                        onClick={() =>
                          openDeleteConfirmation(
                            account
                          )
                        }
                        disabled={
                          deletingId ===
                          account.id
                        }
                      >
                        {deletingId ===
                        account.id ? (
                          <RefreshCw
                            size={17}
                            className="spin"
                          />
                        ) : (
                          <Trash2
                            size={17}
                          />
                        )}
                      </button>

                    </div>

                  </div>

                  <div className="account-card-content">

                    <p className="account-type-label">
                      {
                        ACCOUNT_TYPE_LABELS[
                          account.type
                        ]
                      }
                    </p>

                    <h2>
                      {account.name}
                    </h2>

                    <p className="account-balance-label">
                      Current Balance
                    </p>

                    <strong
  className={`account-balance ${
    Number(account.balance) > 0
      ? "account-balance-positive"
      : Number(account.balance) < 0
        ? "account-balance-negative"
        : "account-balance-zero"
  }`}
>
  {formatCurrency(
    account.balance,
    account.currency ||
      "INR"
  )}
</strong>

                  </div>

                  <div
                    className="account-card-footer"
                    style={{
                      gap: 12,
                      alignItems: "center",
                    }}
                  >

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                        minWidth: 0,
                      }}
                    >
                      <span>
                        Currency
                      </span>

                      <strong>
                        {account.currency}
                      </strong>
                    </div>

                    <button
                      type="button"
                      title={`View transactions for ${account.name}`}
                      onClick={() =>
                        navigate(
                          `/transactions?accountId=${account.id}`
                        )
                      }
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        minHeight: 34,
                        padding: "7px 10px",
                        border: "1px solid #dbe3ef",
                        borderRadius: 9,
                        background: "#ffffff",
                        color: "#4f46e5",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Transactions
                      <ArrowRight size={14} />
                    </button>

                  </div>

                </article>

                )
              )}

              </section>
            )}
          </>
        )}

      </div>

      {/* CREATE / EDIT MODAL */}

      {isModalOpen && (
        <div
          className="modal-overlay"
          role="presentation"
        >

          <div
            className="account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-modal-title"
          >

            {/* MODAL HEADER */}

            <div className="modal-header">

              <div>

                <p className="eyebrow">
                  Account Management
                </p>

                <h2 id="account-modal-title">
                  {editingAccount
                    ? "Edit Account"
                    : "Add New Account"}
                </h2>

              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={
                  closeModal
                }
                disabled={saving}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>

            </div>

            {/* FORM */}

            <form
              className="account-form"
              onSubmit={(event) =>
                void handleSubmit(
                  event
                )
              }
            >

              {/* ACCOUNT NAME */}

              <div className="form-field">

                <label htmlFor="account-name">
                  Account Name
                </label>

                <input
                  id="account-name"
                  type="text"
                  value={
                    formData.name
                  }
                  onChange={(event) =>
                    updateFormField(
                      "name",
                      event
                    )
                  }
                  placeholder="Example: HDFC Bank"
                  maxLength={100}
                  required
                />

              </div>

              {/* ACCOUNT TYPE */}

              <div className="form-field">

                <label htmlFor="account-type">
                  Account Type
                </label>

                <select
                  id="account-type"
                  value={
                    formData.type
                  }
                  onChange={(event) =>
                    updateFormField(
                      "type",
                      event
                    )
                  }
                >

                  {ACCOUNT_TYPES.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {
                          ACCOUNT_TYPE_LABELS[
                            type
                          ]
                        }
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* BALANCE + CURRENCY */}

              <div className="form-row">

                <div className="form-field">

                  <label htmlFor="account-balance">
                    Opening Balance
                  </label>

                  <input
                    id="account-balance"
                    type="number"
                    value={
                      formData.balance
                    }
                    onChange={(event) =>
                      updateFormField(
                        "balance",
                        event
                      )
                    }
                    min="0"
                    step="0.01"
                    required
                  />

                </div>

                <div className="form-field">

                  <label htmlFor="account-currency">
                    Currency
                  </label>

                  <input
                    id="account-currency"
                    type="text"
                    value={
                      formData.currency
                    }
                    onChange={(event) =>
                      updateFormField(
                        "currency",
                        event
                      )
                    }
                    placeholder="INR"
                    maxLength={3}
                    required
                  />

                </div>

              </div>

              {/* FORM ERROR */}

              {formError && (
                <div
                  className="form-error"
                  role="alert"
                >
                  {formError}
                </div>
              )}

              {/* ACTIONS */}

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
                  ) : editingAccount ? (
                    "Update Account"
                  ) : (
                    "Create Account"
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}

      {deleteTarget && (
        <div
          className="modal-overlay"
          role="presentation"
        >

          <div
            className="account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >

            <div className="modal-header">

              <div>

                <p className="eyebrow">
                  Account Management
                </p>

                <h2 id="delete-account-title">
                  Delete Account
                </h2>

              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={
                  cancelDelete
                }
                disabled={
                  deletingId !== null
                }
                aria-label="Close"
              >
                <X size={20} />
              </button>

            </div>

            <div
              style={{
                padding: "20px 0",
                color: "#475569",
                lineHeight: 1.6,
              }}
            >
              Are you sure you want
              to delete{" "}
              <strong>
                "{deleteTarget.name}"
              </strong>
              ?
            </div>

            <div className="modal-actions">

              <button
                type="button"
                className="cancel-button"
                onClick={
                  cancelDelete
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

                    Delete Account
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

export default Accounts;