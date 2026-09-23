import { FormEvent, useEffect, useState } from "react";
import {
  Edit2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import api from "../api/axios";

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

  const fetchCategories = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCategories();
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
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Categories</h1>

          <p>
            Manage all your income and expense
            categories in one place.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openCreateModal}
        >
          <Plus size={17} />
          Add Category
        </button>
      </div>

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
        <div className="empty-state">
          <p>Loading categories...</p>
        </div>
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
                                ? "#2563eb"
                                : "#dc2626",
                              fontWeight: 600,
                            }}
                          >
                            {isIncome
                              ? "Income"
                              : isBoth
                              ? "Income & Expense"
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
                    : "Create a category for income, expenses, or both."}
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
                <label htmlFor="category-type">
                  Category Type
                </label>

                <select
                  id="category-type"
                  name="type"
                  value={form.type}
                  onChange={handleTypeChange}
                  disabled={saving}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="both">Income &amp; Expense</option>
                </select>
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
  );
}

export default Categories;
