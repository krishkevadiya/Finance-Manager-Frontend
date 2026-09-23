import axios from "axios";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { storage } from "../utils/storage";
import { encryptPassword } from "../utils/passwordEncryption";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

const handleEmailChange = (event: unknown) => {
  const input = event as {
    target: {
      value: string;
    };
  };

  setEmail(input.target.value);
};

const handlePasswordChange = (event: unknown) => {
  const input = event as {
    target: {
      value: string;
    };
  };

  setPassword(input.target.value);
};

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const encryptedPassword =
  await encryptPassword(password);

const response =
  await api.post("/auth/login", {
    email,
    encryptedPassword,
  });

      const token =
        response.data?.token ||
        response.data?.accessToken ||
        response.data?.data?.token;

      if (!token) {
        setError(
          "Login response did not contain a token."
        );
        return;
      }

      storage.setToken(token);

      navigate("/dashboard", {
        replace: true,
      });
    } catch (requestError: unknown) {
      if (axios.isAxiosError(requestError)) {
        const responseData = requestError.response?.data as
          | {
              message?: string;
              error?: string;
            }
          | undefined;

        setError(
          responseData?.message ||
            responseData?.error ||
            "Login failed. Please check your email and password."
        );
      } else if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError(
          "Login failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="login-page">
        <div className="login-container">

          {/* LEFT PANEL */}
          <section className="login-hero">
            <div>
              <p className="login-brand">
                Finance Management
              </p>

              <h1 className="login-hero-title">
                Take control of your finances.
              </h1>

              <p className="login-hero-description">
                Track your accounts, manage
                transactions, and understand your
                financial progress from one place.
              </p>
            </div>

            <div className="login-hero-footer">
              <div className="login-hero-dot" />

              <span>
                Your finances, organized.
              </span>
            </div>
          </section>

          {/* RIGHT PANEL */}
          <section className="login-form-section">
            <div className="login-form-container">

              <div className="login-heading">
                <p className="login-welcome">
                  Welcome back
                </p>

                <h2>
                  Sign in to your account
                </h2>

                <p>
                  Enter your credentials to
                  continue.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="login-form"
              >

                {/* EMAIL */}
                <div className="login-field">
                  <label htmlFor="email">
                    Email address
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>

                {/* PASSWORD */}
                <div className="login-field">
                  <label htmlFor="password">
                    Password
                  </label>

                  <div className="password-wrapper">
                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={handlePasswordChange}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowPassword(
                          (previous) => !previous
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="19"
                          height="19"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                          <circle
                            cx="12"
                            cy="12"
                            r="3"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="19"
                          height="19"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c5 0 8.73 4.5 10 7a13.16 13.16 0 0 1-2.04 3.19" />
                          <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12c1.27 2.5 5 7 10 7a10.43 10.43 0 0 0 3.27-.52" />
                          <line
                            x1="2"
                            x2="22"
                            y1="2"
                            y2="22"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* ERROR */}
                {error && (
                  <div
                    className="login-error"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                {/* SUBMIT */}
                <button
                  type="submit"
                  className="login-submit"
                  disabled={loading}
                >
                  {loading
                    ? "Signing in..."
                    : "Sign in"}
                </button>
              </form>

              <p className="login-register">
                Don't have an account?{" "}

                <Link to="/register">
                  Create an account
                </Link>
              </p>
            </div>
          </section>
        </div>
      </main>

      <style>{`
        .login-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          box-sizing: border-box;
          background:
            radial-gradient(
              circle at top left,
              #e0e7ff 0,
              transparent 32%
            ),
            #f1f5f9;
        }

        .login-container {
          display: grid;
          width: 100%;
          max-width: 1050px;
          min-height: 620px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          background: #ffffff;
          box-shadow:
            0 25px 60px rgba(15, 23, 42, 0.12);
          grid-template-columns: 1fr 1fr;
        }

        .login-hero {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 56px;
          color: #ffffff;
          background:
            radial-gradient(
              circle at 85% 15%,
              rgba(99, 102, 241, 0.45),
              transparent 28%
            ),
            #0f172a;
        }

        .login-brand {
          margin: 0 0 22px;
          color: #a5b4fc;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .login-hero-title {
          max-width: 430px;
          margin: 0;
          color: #ffffff;
          font-size: 43px;
          font-weight: 800;
          line-height: 1.12;
        }

        .login-hero-description {
          max-width: 430px;
          margin: 24px 0 0;
          color: #cbd5e1;
          font-size: 16px;
          line-height: 1.8;
        }

        .login-hero-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #94a3b8;
          font-size: 13px;
        }

        .login-hero-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #818cf8;
          box-shadow:
            0 0 0 5px rgba(129, 140, 248, 0.12);
        }

        .login-form-section {
          display: flex;
          align-items: center;
          padding: 56px;
          background: #ffffff;
        }

        .login-form-container {
          width: 100%;
          max-width: 420px;
          margin: 0 auto;
        }

        .login-heading {
          margin-bottom: 32px;
        }

        .login-welcome {
          margin: 0 0 9px;
          color: #4f46e5;
          font-size: 14px;
          font-weight: 700;
        }

        .login-heading h2 {
          margin: 0;
          color: #0f172a;
          font-size: 31px;
          font-weight: 800;
          line-height: 1.2;
        }

        .login-heading > p:last-child {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .login-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .login-field label {
          color: #334155;
          font-size: 13px;
          font-weight: 700;
        }

        .login-field input {
          width: 100%;
          height: 48px;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 11px;
          outline: none;
          padding: 0 14px;
          color: #0f172a;
          background: #ffffff;
          font-size: 14px;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .login-field input::placeholder {
          color: #94a3b8;
        }

        .login-field input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px #e0e7ff;
        }

        .password-wrapper {
          position: relative;
        }

        .password-wrapper input {
          padding-right: 50px;
        }

        .password-toggle {
          position: absolute;
          top: 50%;
          right: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          transform: translateY(-50%);
          border: 0;
          border-radius: 8px;
          color: #64748b;
          background: transparent;
        }

        .password-toggle:hover {
          color: #4f46e5;
          background: #eef2ff;
        }

        .login-error {
          border: 1px solid #fecaca;
          border-radius: 10px;
          padding: 12px 14px;
          color: #b91c1c;
          background: #fef2f2;
          font-size: 13px;
          line-height: 1.5;
        }

        .login-submit {
          width: 100%;
          height: 49px;
          margin-top: 2px;
          border: 1px solid #4f46e5;
          border-radius: 11px;
          color: #ffffff;
          background: #4f46e5;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition:
            background 0.2s ease,
            transform 0.1s ease;
        }

        .login-submit:hover:not(:disabled) {
          background: #4338ca;
        }

        .login-submit:active:not(:disabled) {
          transform: translateY(1px);
        }

        .login-submit:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .login-register {
          margin: 28px 0 0;
          color: #64748b;
          font-size: 13px;
          text-align: center;
        }

        .login-register a {
          color: #4f46e5;
          font-weight: 700;
          text-decoration: none;
        }

        .login-register a:hover {
          color: #4338ca;
          text-decoration: underline;
        }

        @media (max-width: 800px) {
          .login-container {
            grid-template-columns: 1fr;
            min-height: auto;
          }

          .login-hero {
            min-height: 300px;
            padding: 38px;
          }

          .login-hero-title {
            font-size: 34px;
          }

          .login-form-section {
            padding: 40px 30px;
          }
        }

        @media (max-width: 520px) {
          .login-page {
            padding: 0;
            align-items: stretch;
          }

          .login-container {
            min-height: 100vh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .login-hero {
            min-height: 250px;
            padding: 32px 24px;
          }

          .login-hero-title {
            font-size: 30px;
          }

          .login-hero-description {
            margin-top: 16px;
            font-size: 14px;
            line-height: 1.6;
          }

          .login-form-section {
            padding: 34px 24px;
          }

          .login-heading h2 {
            font-size: 27px;
          }
        }
      `}</style>
    </>
  );
}

export default Login;