import { FormEvent, useEffect, useState } from "react";
import {
  Edit2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import api from "../api/axios";
import Loader from "../components/common/Loader";
import CustomSelect, { SelectOption } from "../components/common/CustomSelect";

type CategoryType = "income" | "expense" | "both";

interface Category {
  id: number;
  name: string;
  type: CategoryType;
  userId: number;
  createdAt?: string;
}

interface CategoryForm {
  name: string;
  type: CategoryType;
}

interface ValueEvent {
  target?: {
    value?: unknown;
  };
}

function getEventValue(event: unknown): string {
  const value =
    (event as ValueEvent)?.target?.value;

  return typeof value === "string" ? value : "";
}

function Categories() {
  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);

  const [form, setForm] =
    useState<CategoryForm>({
      name: "",
      type: "expense",
    });

  const fetchCategories = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      }
      setError("");

      const response =
        await api.get("/categories");

      setCategories(
        response.data?.categories ?? []
      );
    } catch {
      setError(
        "Unable to load categories. Please try again."
      );
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchCategories(true);
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);

    setForm({
      name: "",
      type: "expense",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (
    category: Category
  ) => {
    setEditingCategory(category);

    setForm({
      name: category.name,
      type: category.type,
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingCategory(null);

    setForm({
      name: "",
      type: "expense",
    });
  };

  const handleNameChange = (
    event: unknown
  ) => {
    const value = getEventValue(event);

    setForm((current) => ({
      ...current,
      name: value,
    }));
  };

  const handleTypeChange = (
    event: unknown
  ) => {
    const value = getEventValue(event);

    if (
      value !== "income" &&
      value !== "expense" &&
      value !== "both"
    ) {
      return;
    }

    setForm((current) => ({
      ...current,
      type: value,
    }));
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const name = form.name.trim();

    if (!name) {
      setError(
        "Category name is required."
      );
      return;
    }

    if (name.length < 2) {
      setError(
        "Category name must be at least 2 characters."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingCategory) {
        await api.put(
          `/categories/${editingCategory.id}`,
          {
            name,
            type: form.type,
          }
        );

        setSuccess(
          "Category updated successfully."
        );
      } else {
        await api.post(
          "/categories",
          {
            name,
            type: form.type,
          }
        );

        setSuccess(
          "Category created successfully."
        );
      }

      setShowModal(false);
      setEditingCategory(null);

      setForm({
        name: "",
        type: "expense",
      });

      await fetchCategories();
    } catch (error: unknown) {
      const axiosError = error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      };

      setError(
        axiosError.response?.data?.message ||
          "Unable to save category."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (
    category: Category
  ) => {
    const browser =
      globalThis as unknown as {
        confirm?: (
          message: string
        ) => boolean;
      };

    const confirmed =
      browser.confirm?.(
        `Are you sure you want to delete "${category.name}"?`
      ) ?? false;

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(category.id);
      setError("");
      setSuccess("");

      await api.delete(
        `/categories/${category.id}`
      );

      setCategories((current) =>
        current.filter(
          (item) =>
            item.id !== category.id
        )
      );

      setSuccess(
        "Category deleted successfully."
      );
    } catch (error: unknown) {
      const axiosError = error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      };

      setError(
        axiosError.response?.data?.message ||
          "Unable to delete category."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const sortedCategories = [
    ...categories,
  ].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">
              Finance Management
            </p>

            <h1>Categories</h1>

            <p className="page-subtitle">
              Manage all your income and expense categories in one place.
            </p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="primary-button"
              onClick={openCreateModal}
            >
              <Plus size={18} />
              Add Category
            </button>
          </div>
        </header>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {loading ? (
        <Loader message="Loading categories..." fullScreen={false} />
      ) : (
        <section className="category-section">
          <div className="category-section-header">
            <div>
              <h2>All Categories</h2>

              <span>
                {categories.length}{" "}
                {categories.length === 1
                  ? "category"
                  : "categories"}
              </span>
            </div>
          </div>

          {sortedCategories.length === 0 ? (
  <div className="category-empty-state">
    <p className="category-empty-text">
      No categories yet.
    </p>

    <button
      type="button"
      className="primary-button category-empty-button"
      onClick={openCreateModal}
    >
      <Plus size={17} />
      Create Category
    </button>
  </div>
) : (
            <div className="category-list">
              {sortedCategories.map(
                (category) => {
                  const isIncome =
                    category.type === "income";

                  const isBoth =
                    category.type === "both";

                  return (
                    <div
                      key={category.id}
                      className="category-item"
                    >
                      <div className="category-info">
                        <span
                          className={`category-dot ${
                            isIncome
                              ? "income"
                              : isBoth
                              ? "both"
                              : "expense"
                          }`}
                           style={{
                            margin: "8px",
                          }}
                        />

                        <div>
                          <strong>
                            {category.name}
                          </strong>

                          <span
                            style={{
                              color: isIncome
                                ? "#059669"
                                : isBoth
                                ? "#3b5bdb"
                                : "#dc2626",
                              fontWeight: 600,
                            }}
                          >
                            {isIncome
                              ? "Income"
                              // : isBoth
                              // ? "Income & Expense"
                              : "Expense"}
                          </span>
                        </div>
                      </div>

                      <div className="category-actions">
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() =>
                            openEditModal(
                              category
                            )
                          }
                          title="Edit category"
                          aria-label={`Edit ${category.name}`}
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          type="button"
                          className="icon-button danger"
                          onClick={() =>
                            void handleDelete(
                              category
                            )
                          }
                          disabled={
                            deletingId ===
                            category.id
                          }
                          title="Delete category"
                          aria-label={`Delete ${category.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>
      )}

      {showModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
          onTouchEnd={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>
                  {editingCategory
                    ? "Edit Category"
                    : "Add Category"}
                </h2>

                <p>
                  {editingCategory
                    ? "Update your category details."
                    : "Create a category for income and expenses."}
                </p>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="category-form"
              onSubmit={handleSubmit}
            >
              <div className="form-group">
                <label htmlFor="category-name">
                  Category Name
                </label>

                <input
                  id="category-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleNameChange}
                  placeholder="e.g. Food, Salary, Shopping"
                  maxLength={100}
                  disabled={saving}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>
                  Category Type
                </label>

                <CustomSelect
                  value={form.type}
                  options={[
                    { value: "expense", label: "Expense" },
                    { value: "income", label: "Income" },
                  ]}
                  onChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      type: val as CategoryType,
                    }))
                  }
                  disabled={saving}
                  minHeight={46}
                  borderRadius={10}
                  zIndex={1200}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingCategory
                    ? "Update Category"
                    : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}

export default Categories;
