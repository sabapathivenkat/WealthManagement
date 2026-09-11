import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/portfolio", label: "Debt, Savings & Investments" },
  { to: "/monthly-plan", label: "Monthly Income & Expenses" },
  { to: "/debt-planner", label: "Yearly Debt Settlement Plan" },
];

export default function Layout() {
  const { name, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Wealth Planner</div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? "active" : "")}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <NavLink to="/settings" className={({ isActive }) => `settings-link${isActive ? " active" : ""}`}>
            ⚙ Settings
          </NavLink>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span>{name}</span>
            <button onClick={logout}>Log out</button>
          </div>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
