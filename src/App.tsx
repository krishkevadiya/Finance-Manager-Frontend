import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  BarChart3,
  CreditCard,
  FolderTree,
  LayoutDashboard,
  LogOut,
  WalletCards,
  PiggyBank,
  Menu,
  X,
  Trash2,
} from "lucide-react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";
import Budgets from "./pages/Budgets";
import RecentlyDeleted from "./pages/RecentlyDeleted";

import ProtectedRoute from "./components/ProtectedRoute";

import { storage } from "./utils/storage";
import logo from "./assets/logo.png";

function ProtectedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    storage.removeToken();

    navigate("/login", {
      replace: true,
    });
  };

  const navLinks = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/accounts", label: "Accounts", icon: WalletCards },
    { to: "/transactions", label: "Transactions", icon: CreditCard },
    { to: "/categories", label: "Categories", icon: FolderTree },
    { to: "/budgets", label: "Budgets", icon: PiggyBank },
    { to: "/recently-deleted", label: "Recently Deleted", icon: Trash2 },
  ];

  return (
    <div className="app-shell">
      {/* Mobile Topbar */}
      <header className="app-mobile-topbar">
        <NavLink
          to="/dashboard"
          className="app-brand"
          aria-label="Finance Management Dashboard"
        >
          <span className="app-brand-mark">
            <img src={logo} alt="FinStack Logo" className="app-brand-logo-img" />
          </span>

          <span className="app-brand-text">
            <span className="app-brand-title">FinStack</span>
            <span className="app-brand-subtitle">Personal Finance</span>
          </span>
        </NavLink>

        <button
          type="button"
          className="app-mobile-menu-btn"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="app-sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar */}
      <aside className={`app-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="app-sidebar-header">
          <NavLink
            to="/dashboard"
            className="app-brand"
            aria-label="Finance Management Dashboard"
            onClick={() => setMobileOpen(false)}
          >
            <span className="app-brand-mark">
              <img src={logo} alt="FinStack Logo" className="app-brand-logo-img" />
            </span>

            <span className="app-brand-text">
              <span className="app-brand-title">FinStack</span>
              <span className="app-brand-subtitle">Personal Finance</span>
            </span>
          </NavLink>
        </div>

        <nav className="app-sidebar-nav">
          <div className="app-sidebar-links">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `app-sidebar-link${isActive ? " active" : ""}`
                  }
                >
                  <Icon size={18} className="app-sidebar-icon" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        <div className="app-sidebar-footer">
          <button
            type="button"
            className="app-sidebar-logout"
            onClick={handleLogout}
            aria-label="Log out"
          >
            <LogOut size={18} className="app-sidebar-icon" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
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

            <Route
              path="/recently-deleted"
              element={<RecentlyDeleted />}
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