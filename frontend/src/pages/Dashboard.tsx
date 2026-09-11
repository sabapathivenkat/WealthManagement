import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dashboardApi } from "../api/endpoints";
import type { DashboardResponse, YearlySummaryResponse } from "../api/types";
import MonthPicker from "../components/MonthPicker";
import { currentMonth, formatCompact, formatCurrency } from "../utils/format";

const PIE_COLORS = ["var(--series-1)", "var(--series-2)", "var(--status-good)", "#a366d9", "#d9b366", "#66c2d9", "#d966a3"];

function currentFinancialYear(): number {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() + 1 >= 4 ? y : y - 1;
}

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<"MONTH" | "YEAR">("MONTH");
  const [month, setMonth] = useState(searchParams.get("month") ?? currentMonth());
  const [fyStart, setFyStart] = useState(currentFinancialYear());
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [yearly, setYearly] = useState<YearlySummaryResponse | null>(null);

  useEffect(() => {
    if (view === "MONTH") dashboardApi.summary(month).then(setData);
  }, [view, month]);

  useEffect(() => {
    if (view === "YEAR") dashboardApi.yearly(fyStart).then(setYearly);
  }, [view, fyStart]);

  const fyLabel = `FY ${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <div className="period-controls">
          <div className="segmented">
            <button type="button" className={view === "MONTH" ? "active" : ""} onClick={() => setView("MONTH")}>
              Monthly
            </button>
            <button type="button" className={view === "YEAR" ? "active" : ""} onClick={() => setView("YEAR")}>
              Yearly
            </button>
          </div>
          {view === "MONTH" ? (
            <div style={{ width: 200 }}>
              <MonthPicker value={month} onChange={(v) => v && setMonth(v)} />
            </div>
          ) : (
            <select value={fyStart} onChange={(e) => setFyStart(Number(e.target.value))}>
              {Array.from({ length: 6 }, (_, i) => currentFinancialYear() - 4 + i).map((y) => (
                <option key={y} value={y}>
                  FY {y}-{String((y + 1) % 100).padStart(2, "0")}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {view === "MONTH" &&
        (!data ? (
          <p className="empty-state">Loading…</p>
        ) : (
          <>
            <div className="stat-row">
              <div className="stat-tile">
                <span>Total Assets</span>
                <strong>{formatCurrency(data.totalAssets)}</strong>
              </div>
              <div className="stat-tile">
                <span>Total Debt</span>
                <strong>{formatCurrency(data.totalDebt)}</strong>
              </div>
              <div className={`stat-tile ${data.netWorth >= 0 ? "net" : "expense"}`}>
                <span>Net Worth</span>
                <strong>{formatCurrency(data.netWorth)}</strong>
              </div>
            </div>

            <div className="stat-row">
              <div className="stat-tile income">
                <span>Monthly Income</span>
                <strong>{formatCurrency(data.monthlyIncome)}</strong>
              </div>
              <div className="stat-tile expense">
                <span>Monthly Expenses</span>
                <strong>{formatCurrency(data.monthlyExpenses)}</strong>
              </div>
              <div className="stat-tile">
                <span>Monthly Savings</span>
                <strong>{formatCurrency(data.monthlySavings)}</strong>
              </div>
              <div className="stat-tile">
                <span>Savings Rate</span>
                <strong>{data.savingsRate}%</strong>
              </div>
            </div>

            <div className="stat-row">
              <div className="stat-tile">
                <span>Debt Paid This Month</span>
                <strong>{formatCurrency(data.debtPaidThisMonth)}</strong>
              </div>
              <div className="stat-tile">
                <span>Remaining Debt</span>
                <strong>{formatCurrency(data.remainingDebt)}</strong>
              </div>
              <div className="stat-tile">
                <span>Est. Debt-Free Date</span>
                <strong>{data.estimatedDebtFreeDate ?? "—"}</strong>
              </div>
              <div className="stat-tile">
                <span>Emergency Fund Coverage</span>
                <strong>{data.emergencyFundCoverageMonths} mo</strong>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="card">
                <h2>Net Worth Trend</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--gridline)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => formatCompact(Number(v))} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Legend />
                    <Line type="monotone" dataKey="totalAssets" name="Assets" stroke="var(--status-good)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="totalDebt" name="Debt" stroke="var(--series-2)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="netWorth" name="Net Worth" stroke="var(--series-1)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h2>Income vs Expenses</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--gridline)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => formatCompact(Number(v))} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="var(--series-1)" />
                    <Bar dataKey="expense" name="Expense" fill="var(--series-2)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h2>Savings Growth</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--gridline)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => formatCompact(Number(v))} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Line type="monotone" dataKey="totalAssets" name="Total Savings" stroke="var(--status-good)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h2>Debt Reduction</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--gridline)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => formatCompact(Number(v))} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Line type="monotone" dataKey="totalDebt" name="Outstanding Debt" stroke="var(--series-2)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h2>Monthly Savings</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--gridline)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => formatCompact(Number(v))} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Bar dataKey="savingsContributions" name="Savings Contributions" fill="var(--series-1)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h2>Expense Category Breakdown</h2>
                {data.expenseByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data.expenseByCategory} dataKey="amount" nameKey="categoryName" outerRadius={80} label>
                        {data.expenseByCategory.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="empty-state">No expenses recorded this month.</p>
                )}
              </div>

              <div className="card">
                <h2>Savings Allocation</h2>
                {data.savingsAllocation.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data.savingsAllocation} dataKey="amount" nameKey="label" outerRadius={80} label>
                        {data.savingsAllocation.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="empty-state">No savings tracked yet.</p>
                )}
              </div>
            </div>
          </>
        ))}

      {view === "YEAR" &&
        (!yearly ? (
          <p className="empty-state">Loading…</p>
        ) : (
          <>
            <div className="card">
              <h2>{fyLabel} Summary</h2>
              <div className="stat-row">
                <div className="stat-tile income">
                  <span>Total Income</span>
                  <strong>{formatCurrency(yearly.totalIncome)}</strong>
                </div>
                <div className="stat-tile expense">
                  <span>Total Expenses</span>
                  <strong>{formatCurrency(yearly.totalExpenses)}</strong>
                </div>
                <div className="stat-tile">
                  <span>Savings Contributions</span>
                  <strong>{formatCurrency(yearly.totalSavingsContributions)}</strong>
                </div>
                <div className="stat-tile">
                  <span>Debt Repaid</span>
                  <strong>{formatCurrency(yearly.totalDebtRepaid)}</strong>
                </div>
              </div>
              <div className="stat-row">
                <div className="stat-tile">
                  <span>Beginning → Ending Assets</span>
                  <strong>
                    {formatCompact(yearly.beginningAssets)} → {formatCompact(yearly.endingAssets)}
                  </strong>
                </div>
                <div className="stat-tile">
                  <span>Beginning → Ending Debt</span>
                  <strong>
                    {formatCompact(yearly.beginningDebt)} → {formatCompact(yearly.endingDebt)}
                  </strong>
                </div>
                <div className={`stat-tile ${yearly.netWorthGrowth >= 0 ? "net" : "expense"}`}>
                  <span>Net Worth Growth</span>
                  <strong>{formatCurrency(yearly.netWorthGrowth)}</strong>
                </div>
                <div className="stat-tile">
                  <span>Savings Rate / Debt Reduction</span>
                  <strong>
                    {yearly.savingsRate}% / {yearly.debtReductionPercent}%
                  </strong>
                </div>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="card">
                <h2>Net Worth Trend ({fyLabel})</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={yearly.months} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--gridline)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => formatCompact(Number(v))} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Legend />
                    <Line type="monotone" dataKey="totalAssets" name="Assets" stroke="var(--status-good)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="totalDebt" name="Debt" stroke="var(--series-2)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="netWorth" name="Net Worth" stroke="var(--series-1)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h2>Income vs Expenses ({fyLabel})</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={yearly.months} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--gridline)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => formatCompact(Number(v))} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="var(--series-1)" />
                    <Bar dataKey="expense" name="Expense" fill="var(--series-2)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h2>Month by month</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Income</th>
                    <th>Expenses</th>
                    <th>Savings Contributions</th>
                    <th>Debt Paid</th>
                    <th>Net Worth</th>
                  </tr>
                </thead>
                <tbody>
                  {yearly.months.map((m) => (
                    <tr key={m.month}>
                      <td>{m.month}</td>
                      <td className="amount-income">{formatCurrency(m.income)}</td>
                      <td className="amount-expense">{formatCurrency(m.expense)}</td>
                      <td>{formatCurrency(m.savingsContributions)}</td>
                      <td>{formatCurrency(m.debtPayments)}</td>
                      <td>{formatCurrency(m.netWorth)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ))}
    </div>
  );
}
