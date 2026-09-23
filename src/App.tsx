import {
  BrowserRouter,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import {
  BarChart3,
  CreditCard,
  FolderTree,
  LayoutDashboard,
  LogOut,
  WalletCards,
  PiggyBank,
} from "lucide-react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";
import Budgets from "./pages/Budgets";

import ProtectedRoute from "./components/ProtectedRoute";

function ProtectedLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    const browser = globalThis as unknown as {
      localStorage?: {
        removeItem: (key: string) => void;
      };
    };

    browser.localStorage?.removeItem("token");

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <div className="app-shell">
      <nav className="app-navigation">
        <div className="app-navigation-inner">
          <NavLink
            to="/dashboard"
            className="app-brand"
            aria-label="Finance Management Dashboard"
          >
            <span className="app-brand-mark">
              <BarChart3 size={19} />
            </span>

            <span className="app-brand-text">
              <span className="app-brand-title">
                Finance Manager
              </span>

              <span className="app-brand-subtitle">
                Personal Finance
              </span>
            </span>
          </NavLink>

          <div className="app-nav-links">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `app-nav-link${isActive ? " active" : ""}`
              }
            >
              <LayoutDashboard size={16} />
              Dashboard
            </NavLink>

            <NavLink
              to="/accounts"
              className={({ isActive }) =>
                `app-nav-link${isActive ? " active" : ""}`
              }
            >
              <WalletCards size={16} />
              Accounts
            </NavLink>

            <NavLink
              to="/transactions"
              className={({ isActive }) =>
                `app-nav-link${isActive ? " active" : ""}`
              }
            >
              <CreditCard size={16} />
              Transactions
            </NavLink>

            <NavLink
  to="/categories"
  className={({ isActive }) =>
    `app-nav-link${isActive ? " active" : ""}`
  }
>
  <FolderTree size={16} />
  Categories
</NavLink>

            <NavLink
                to="/budgets"
                className={({ isActive }) =>
                  `app-nav-link${isActive ? " active" : ""}`
                }
              >
                <PiggyBank size={16} />
                Budgets
              </NavLink>              
          </div>

          <button
            type="button"
            className="app-nav-logout"
            onClick={handleLogout}
          >
            <LogOut size={16} />

            <span className="app-nav-logout-label">
              Logout
            </span>
          </button>
        </div>
      </nav>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        <Route
          path="/login"
          element={<Login />}
        />
        <Route
          path="/register"
          element={<Register />}
        />
        <Route element={<ProtectedRoute />}>
          <Route element={<ProtectedLayout />}>
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/accounts"
              element={<Accounts />}
            />

            <Route
                  path="/budgets"
                  element={<Budgets />}
            />

            <Route
              path="/transactions"
              element={<Transactions />}
            />

            <Route
              path="/categories"
              element={<Categories />}
            />
          </Route>
        </Route>

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;