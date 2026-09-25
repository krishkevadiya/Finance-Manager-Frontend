import {
  useState,
  type CSSProperties,
  type FormEvent,
  type ChangeEvent,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  Eye,
  EyeOff,
  UserPlus,
} from "lucide-react";

import api from "../api/axios";
import { encryptPassword } from "../utils/passwordEncryption";
import logo from "../assets/logo.png";

interface RegisterResponse {
  message?: string;
  error?: string;
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "30px 20px",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at 10% 15%, rgba(79,70,229,0.15), transparent 30%), radial-gradient(circle at 90% 85%, rgba(37,99,235,0.14), transparent 30%), #eaf4fe",
    fontFamily:
      "Inter, Arial, Helvetica, sans-serif",
  },

  decorationOne: {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    top: "-200px",
    left: "-160px",
    background: "rgba(79,70,229,0.08)",
    pointerEvents: "none",
  },

  decorationTwo: {
    position: "absolute",
    width: "450px",
    height: "450px",
    borderRadius: "50%",
    right: "-220px",
    bottom: "-220px",
    background: "rgba(37,99,235,0.08)",
    pointerEvents: "none",
  },

  container: {
    width: "100%",
    maxWidth: "470px",
    position: "relative",
    zIndex: 5,
  },

  card: {
    width: "100%",
    boxSizing: "border-box",
    padding: "42px",
    borderRadius: "24px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    boxShadow:
      "0 25px 70px rgba(15,23,42,0.13), 0 8px 24px rgba(15,23,42,0.05)",
    position: "relative",
    zIndex: 5,
  },

  header: {
    textAlign: "center",
    marginBottom: "30px",
  },

  logo: {
    width: "62px",
    height: "62px",
    margin: "0 auto 20px",
    borderRadius: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 28px rgba(37,99,235,0.12)",
    padding: "4px",
    boxSizing: "border-box",
  },

  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: "30px",
    fontWeight: 800,
    lineHeight: 1.2,
  },

  subtitle: {
    margin: "10px 0 0",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    position: "relative",
    zIndex: 6,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    position: "relative",
    zIndex: 6,
  },

  label: {
    color: "#334155",
    fontSize: "13px",
    fontWeight: 700,
  },

  input: {
    width: "100%",
    height: "48px",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    outline: "none",
    padding: "0 14px",
    color: "#0f172a",
    background: "#ffffff",
    fontSize: "14px",
    position: "relative",
    zIndex: 10,
    pointerEvents: "auto",
    userSelect: "text",
  },

  passwordWrapper: {
    position: "relative",
    width: "100%",
    zIndex: 6,
  },

  passwordInput: {
    width: "100%",
    height: "48px",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    outline: "none",
    padding: "0 48px 0 14px",
    color: "#0f172a",
    background: "#ffffff",
    fontSize: "14px",
    position: "relative",
    zIndex: 10,
    pointerEvents: "auto",
    userSelect: "text",
  },

  passwordButton: {
    position: "absolute",
    top: "50%",
    right: "7px",
    transform: "translateY(-50%)",
    width: "36px",
    height: "36px",
    border: "none",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    background: "transparent",
    cursor: "pointer",
    zIndex: 20,
  },

  error: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    background: "#fef2f2",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  success: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #a7f3d0",
    color: "#047857",
    background: "#ecfdf5",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  submit: {
    width: "100%",
    height: "50px",
    marginTop: "4px",
    border: "none",
    borderRadius: "12px",
    color: "#ffffff",
    background:
      "linear-gradient(135deg, #3b5bdb, #3b5bdb)",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow:
      "0 10px 24px rgba(79,70,229,0.22)",
    position: "relative",
    zIndex: 10,
  },

  loginText: {
    margin: "24px 0 0",
    color: "#64748b",
    fontSize: "13px",
    textAlign: "center",
  },

  loginLink: {
    color: "#3b5bdb",
    fontWeight: 800,
    textDecoration: "none",
  },
};

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /*
   * FIX:
   * Use the actual React input event and
   * read the value from event.target.value.
   */

  const handleNameChange = (event: unknown) => {
  const target = (
    event as {
      target?: {
        value?: string;
      };
    }
  ).target;

  setName(target?.value ?? "");
};

const handleEmailChange = (event: unknown) => {
  const target = (
    event as {
      target?: {
        value?: string;
      };
    }
  ).target;

  setEmail(target?.value ?? "");
};

const handlePasswordChange = (event: unknown) => {
  const target = (
    event as {
      target?: {
        value?: string;
      };
    }
  ).target;

  setPassword(target?.value ?? "");
};

const handleConfirmPasswordChange = (
  event: unknown
) => {
  const target = (
    event as {
      target?: {
        value?: string;
      };
    }
  ).target;

  setConfirmPassword(target?.value ?? "");
};

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setSuccess("");

    const normalizedName =
      name.trim();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedName) {
      setError("Name is required.");
      return;
    }

    if (normalizedName.length < 2) {
      setError(
        "Name must be at least 2 characters."
      );
      return;
    }

    if (normalizedName.length > 100) {
      setError(
        "Name cannot exceed 100 characters."
      );
      return;
    }

    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        normalizedEmail
      )
    ) {
      setError(
        "Please enter a valid email address."
      );
      return;
    }

    if (!password) {
      setError(
        "Password is required."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (!confirmPassword) {
      setError(
        "Please confirm your password."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    setLoading(true);

    try {
      const encryptedPassword =
        await encryptPassword(
          password
        );

      await api.post<RegisterResponse>(
        "/auth/register",
        {
          name: normalizedName,
          email: normalizedEmail,
          encryptedPassword,
        }
      );

      setSuccess(
        "Account created successfully. Redirecting to login..."
      );

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      const browser =
        globalThis as unknown as {
          setTimeout?: (
            callback: () => void,
            delay: number
          ) => unknown;
        };

      browser.setTimeout?.(
        () => {
          navigate(
            "/login",
            {
              replace: true,
            }
          );
        },
        1200
      );
    } catch (
      requestError: unknown
    ) {
      const errorResponse =
        requestError as {
          response?: {
            data?: {
              message?: string;
              error?: string;
            };
          };
          message?: string;
        };

      const serverMessage =
        errorResponse
          .response
          ?.data
          ?.message ||
        errorResponse
          .response
          ?.data
          ?.error ||
        errorResponse.message;

      setError(
        serverMessage ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page} className="register-page">
      <style>{`
        @media (max-width: 520px) {
          .register-page {
            padding: 16px 12px !important;
          }
          .register-card {
            padding: 24px 18px !important;
            border-radius: 18px !important;
          }
        }
      `}</style>

      <div
        style={styles.decorationOne}
      />

      <div
        style={styles.decorationTwo}
      />

      <div
        style={styles.container}
      >
        <div style={styles.card} className="register-card">
          <div style={styles.header}>
            <div style={styles.logo}>
              <img
                src={logo}
                alt="FinStack Logo"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>

            <h1 style={styles.title}>
              Create account
            </h1>

            <p
              style={styles.subtitle}
            >
              Start managing your
              personal finances
            </p>
          </div>

          <form
            style={styles.form}
            onSubmit={handleSubmit}
          >
            {error && (
              <div
                style={styles.error}
                role="alert"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                style={styles.success}
                role="status"
              >
                {success}
              </div>
            )}

            <div style={styles.field}>
              <label
                htmlFor="register-name"
                style={styles.label}
              >
                Full name
              </label>

              <input
                id="register-name"
                name="name"
                type="text"
                value={name}
                onChange={
                  handleNameChange
                }
                placeholder="Enter your name"
                autoComplete="name"
                autoFocus
                disabled={false}
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label
                htmlFor="register-email"
                style={styles.label}
              >
                Email address
              </label>

              <input
                id="register-email"
                name="email"
                type="email"
                value={email}
                onChange={
                  handleEmailChange
                }
                placeholder="Enter your email"
                autoComplete="email"
                disabled={loading}
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label
                htmlFor="register-password"
                style={styles.label}
              >
                Password
              </label>

              <div
                style={
                  styles.passwordWrapper
                }
              >
                <input
                  id="register-password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={
                    handlePasswordChange
                  }
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  disabled={loading}
                  style={
                    styles.passwordInput
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  disabled={loading}
                  style={
                    styles.passwordButton
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div style={styles.field}>
              <label
                htmlFor="register-confirm-password"
                style={styles.label}
              >
                Confirm password
              </label>

              <div
                style={
                  styles.passwordWrapper
                }
              >
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    confirmPassword
                  }
                  onChange={
                    handleConfirmPasswordChange
                  }
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  disabled={loading}
                  style={
                    styles.passwordInput
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) =>
                        !current
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  disabled={loading}
                  style={
                    styles.passwordButton
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submit,
                opacity:
                  loading ? 0.65 : 1,
                cursor:
                  loading
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {loading
                ? "Creating account..."
                : "Create account"}
            </button>
          </form>

          <p
            style={
              styles.loginText
            }
          >
            Already have an account?{" "}

            <Link
              to="/login"
              style={
                styles.loginLink
              }
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;