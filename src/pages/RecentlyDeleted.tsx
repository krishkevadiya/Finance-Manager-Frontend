import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RotateCcw,
  Trash2,
  RefreshCw,
  WalletCards,
  CreditCard,
  PiggyBank,
  FolderTree,
  AlertCircle,
  CheckCircle2,
  Archive,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import api from "../api/axios";
import Loader from "../components/common/Loader";

export interface DeletedItem {
  id: number;
  itemType: "transaction" | "account" | "budget" | "category";
  title: string;
  data: any;
  userId: number;
  deletedAt: string;
}

type FilterType = "all" | "transaction" | "account" | "budget" | "category";

function browserConfirm(message: string): boolean {
  const browser = globalThis as unknown as {
    confirm?: (message: string) => boolean;
  };

  if (typeof browser.confirm === "function") {
    return browser.confirm(message);
  }

  return true;
}

const logError = (...args: unknown[]) => {
  const browser = globalThis as unknown as {
    console?: { error?: (...args: unknown[]) => void };
  };
  browser.console?.error?.(...args);
};

export default function RecentlyDeleted() {
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterType>("all");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fetchDeletedItems = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setRefreshing(true);

      const response = await api.get<{
        success: boolean;
        data: DeletedItem[];
      }>("/deleted-items");

      if (response.data?.data) {
        setItems(response.data.data);
      }
    } catch (err: any) {
      logError("Fetch deleted items error:", err);
      setErrorMessage(
        err.response?.data?.message || "Failed to load recently deleted items"
      );
    } finally {
      if (isInitial) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDeletedItems(true);
  }, [fetchDeletedItems]);

  const handleRestore = async (id: number) => {
    try {
      setActionLoading(id);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await api.post(`/deleted-items/${id}/restore`);
      setSuccessMessage(response.data?.message || "Item restored successfully!");
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Failed to restore item");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePermanently = async (id: number) => {
    if (!browserConfirm("Are you sure you want to permanently delete this item? This action cannot be undone.")) {
      return;
    }

    try {
      setActionLoading(id);
      setErrorMessage("");
      setSuccessMessage("");

      await api.delete(`/deleted-items/${id}`);
      setSuccessMessage("Item permanently deleted.");
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || "Failed to permanently delete item"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreAll = async () => {
    if (items.length === 0) return;
    if (!browserConfirm(`Restore all ${items.length} deleted items?`)) return;

    try {
      setBulkLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await api.post("/deleted-items/restore-all");
      setSuccessMessage(response.data?.message || "All items restored successfully!");
      await fetchDeletedItems(false);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || "Failed to restore all items"
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const handleEmptyTrash = async () => {
    if (items.length === 0) return;
    if (!browserConfirm("Permanently delete ALL items in Recently Deleted? This cannot be undone.")) return;

    try {
      setBulkLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      await api.delete("/deleted-items");
      setSuccessMessage("Trash emptied successfully.");
      setItems([]);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Failed to empty trash");
    } finally {
      setBulkLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (activeTab === "all") return items;
    return items.filter((item) => item.itemType === activeTab);
  }, [items, activeTab]);

  const counts = useMemo(() => {
    const counts = { all: items.length, transaction: 0, account: 0, budget: 0, category: 0 };
    items.forEach((item) => {
      if (counts[item.itemType] !== undefined) {
        counts[item.itemType]++;
      }
    });
    return counts;
  }, [items]);

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getItemIcon = (item: DeletedItem) => {
    switch (item.itemType) {
      case "transaction":
        return item.data?.type === "income" ? (
          <div className="stat-icon green-icon" style={{ width: 36, height: 36, borderRadius: 10 }}>
            <ArrowUpRight size={18} />
          </div>
        ) : (
          <div className="stat-icon red-icon" style={{ width: 36, height: 36, borderRadius: 10 }}>
            <ArrowDownRight size={18} />
          </div>
        );
      case "account":
        return (
          <div className="stat-icon blue-icon" style={{ width: 36, height: 36, borderRadius: 10 }}>
            <WalletCards size={18} />
          </div>
        );
      case "budget":
        return (
          <div className="stat-icon purple-icon" style={{ width: 36, height: 36, borderRadius: 10 }}>
            <PiggyBank size={18} />
          </div>
        );
      case "category":
        return (
          <div className="stat-icon" style={{ width: 36, height: 36, borderRadius: 10, background: "#fef3c7", color: "#d97706" }}>
            <FolderTree size={18} />
          </div>
        );
      default:
        return (
          <div className="stat-icon blue-icon" style={{ width: 36, height: 36, borderRadius: 10 }}>
            <Archive size={18} />
          </div>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { bg: string; color: string; label: string }> = {
      transaction: { bg: "#eaedff", color: "#3b5bdb", label: "Transaction" },
      account: { bg: "#e0f2fe", color: "#0284c7", label: "Account" },
      budget: { bg: "#ede8ff", color: "#7c3aed", label: "Budget" },
      category: { bg: "#fef3c7", color: "#b45309", label: "Category" },
    };
    const c = config[type] || { bg: "#f1f5f9", color: "#475569", label: type };
    return (
      <span
        style={{
          display: "inline-block",
          padding: "3px 9px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          background: c.bg,
          color: c.color,
        }}
      >
        {c.label}
      </span>
    );
  };

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        {/* HEADER */}
        <section className="dashboard-header">
          <div className="header-title-wrap">
            <h1>Recently Deleted</h1>
            <p className="page-subtitle">
              Items deleted by mistake are safely backed up here. Restore them anytime.
            </p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => fetchDeletedItems(false)}
              disabled={refreshing}
              title="Refresh list"
            >
              <RefreshCw size={15} className={refreshing ? "spin" : ""} />
              Refresh
            </button>

            {items.length > 0 && (
              <>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }}
                  onClick={handleEmptyTrash}
                  disabled={bulkLoading}
                >
                  <Trash2 size={15} />
                  Empty Trash
                </button>

                <button
                  type="button"
                  className="primary-button compact-btn"
                  onClick={handleRestoreAll}
                  disabled={bulkLoading}
                >
                  <RotateCcw size={15} />
                  Restore All
                </button>
              </>
            )}
          </div>
        </section>

        {/* ALERTS */}
        {successMessage && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 18px",
              borderRadius: 14,
              background: "#ecfdf5",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#065f46",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={18} color="#10b981" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 18px",
              borderRadius: 14,
              background: "#fef2f2",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#991b1b",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <AlertCircle size={18} color="#ef4444" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STATS CARDS */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-top">
              <p className="stat-label">Total Backups</p>
              <div className="stat-icon blue-icon">
                <Archive size={18} />
              </div>
            </div>
            <h2 title={String(items.length)}>{items.length}</h2>
            <p className="stat-description" title="Available for instant restore">Available for instant restore</p>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <p className="stat-label">Transactions</p>
              <div className="stat-icon green-icon">
                <CreditCard size={18} />
              </div>
            </div>
            <h2 title={String(counts.transaction)}>{counts.transaction}</h2>
            <p className="stat-description" title="Deleted transaction backups">Deleted transaction backups</p>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <p className="stat-label">Budgets</p>
              <div className="stat-icon purple-icon">
                <PiggyBank size={18} />
              </div>
            </div>
            <h2 title={String(counts.budget)}>{counts.budget}</h2>
            <p className="stat-description" title="Deleted budget plans">Deleted budget plans</p>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <p className="stat-label">Accounts &amp; Categories</p>
              <div className="stat-icon blue-icon">
                <WalletCards size={18} />
              </div>
            </div>
            <h2 title={String(counts.account + counts.category)}>{counts.account + counts.category}</h2>
            <p className="stat-description" title="Deleted accounts or categories">Deleted accounts or categories</p>
          </div>

        </section>

        {/* TABS & LIST PANEL */}
        <section className="panel" style={{ padding: "20px 24px" }}>
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderBottom: "1px solid rgba(186, 215, 245, 0.5)",
              paddingBottom: 16,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            {[
              { id: "all", label: "All Items", count: counts.all },
              { id: "transaction", label: "Transactions", count: counts.transaction },
              { id: "account", label: "Accounts", count: counts.account },
              { id: "budget", label: "Budgets", count: counts.budget },
              { id: "category", label: "Categories", count: counts.category },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as FilterType)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "none",
                  fontSize: 13,
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  color: activeTab === tab.id ? "#ffffff" : "#475569",
                  background: activeTab === tab.id ? "#3b5bdb" : "#f1f5f9",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    display: "inline-block",
                    padding: "1px 7px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: activeTab === tab.id ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                    color: activeTab === tab.id ? "#ffffff" : "#64748b",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* List Content */}
          {loading ? (
            <Loader message="Loading deleted backups..." fullScreen={false} />
          ) : filteredItems.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 20px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  background: "#e0f2fe",
                  color: "#0284c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Archive size={30} />
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                {activeTab === "all"
                  ? "Trash is empty"
                  : `No deleted ${activeTab}s`}
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", maxWidth: 420 }}>
                When you delete transactions, accounts, budgets, or categories, they are automatically backed up here so you can easily restore them anytime.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    borderRadius: 14,
                    background: "#ffffff",
                    border: "1px solid rgba(186, 215, 245, 0.6)",
                    boxShadow: "0 1px 4px rgba(59, 91, 219, 0.04)",
                    gap: 16,
                    flexWrap: "wrap",
                    transition: "box-shadow 0.15s ease",
                  }}
                >
                  {/* Left: Icon & Details */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 260, flex: 1 }}>
                    {getItemIcon(item)}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {getTypeBadge(item.itemType)}
                        <strong style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                          {item.title}
                        </strong>
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span>Deleted on {formatDateTime(item.deletedAt)}</span>
                        {item.data?.category && (
                          <span>Category: <strong>{item.data.category}</strong></span>
                        )}
                        {item.data?.accountName && (
                          <span>Account: <strong>{item.data.accountName}</strong></span>
                        )}
                        {item.data?.description && (
                          <span style={{ color: "#94a3b8" }}>&ldquo;{item.data.description}&rdquo;</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      className="primary-button compact-btn"
                      onClick={() => handleRestore(item.id)}
                      disabled={actionLoading === item.id || bulkLoading}
                      style={{ padding: "0 16px", minHeight: 36, fontSize: 12.5 }}
                      title="Restore this item"
                    >
                      <RotateCcw size={14} className={actionLoading === item.id ? "spin" : ""} />
                      {actionLoading === item.id ? "Restoring..." : "Restore"}
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleDeletePermanently(item.id)}
                      disabled={actionLoading === item.id || bulkLoading}
                      style={{
                        padding: "0 14px",
                        minHeight: 36,
                        fontSize: 12.5,
                        color: "#ef4444",
                        borderColor: "rgba(239, 68, 68, 0.25)",
                      }}
                      title="Delete permanently"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
