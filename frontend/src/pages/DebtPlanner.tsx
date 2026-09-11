import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { debtApi } from "../api/endpoints";
import type { DebtRecommendation, PayoffStrategy, SmartPlanResponse, StrategyResult } from "../api/types";
import { formatCompact, formatCurrency } from "../utils/format";

const STRATEGY_LABELS: Record<PayoffStrategy, string> = {
  AVALANCHE: "Avalanche (highest interest first)",
  SNOWBALL: "Snowball (smallest balance first)",
  CUSTOM: "Custom priority",
};

export default function DebtPlanner() {
  const [smartPlan, setSmartPlan] = useState<SmartPlanResponse | null>(null);
  const [recommendation, setRecommendation] = useState<DebtRecommendation[]>([]);

  const [exploreOpen, setExploreOpen] = useState(false);
  const [extraPayment, setExtraPayment] = useState("0");
  const [strategy, setStrategy] = useState<PayoffStrategy>("AVALANCHE");
  const [avalanche, setAvalanche] = useState<StrategyResult | null>(null);
  const [snowball, setSnowball] = useState<StrategyResult | null>(null);
  const [custom, setCustom] = useState<StrategyResult | null>(null);
  const [noExtraMonths, setNoExtraMonths] = useState<Record<PayoffStrategy, number> | null>(null);

  const extra = Number(extraPayment) || 0;

  useEffect(() => {
    debtApi.recommendation().then(setRecommendation);
    debtApi.smartPlan().then(setSmartPlan);
    debtApi.payoffPlan(0).then((plan) => {
      debtApi.customPlan(0).then((c) => {
        setNoExtraMonths({
          AVALANCHE: plan.avalanche.totalMonths,
          SNOWBALL: plan.snowball.totalMonths,
          CUSTOM: c.totalMonths,
        });
      });
    });
  }, []);

  useEffect(() => {
    if (!exploreOpen) return;
    debtApi.payoffPlan(extra).then((plan) => {
      setAvalanche(plan.avalanche);
      setSnowball(plan.snowball);
    });
    debtApi.customPlan(extra).then(setCustom);
  }, [extra, exploreOpen]);

  function openExplorer() {
    if (!exploreOpen && smartPlan) {
      // Seed the manual explorer with the app's own automatic choice, so tweaking starts
      // from the plan already picked rather than an arbitrary blank slate.
      setStrategy(smartPlan.chosenStrategy);
      setExtraPayment(String(smartPlan.suggestedExtraPayment));
    }
    setExploreOpen((o) => !o);
  }

  const results: Record<PayoffStrategy, StrategyResult | null> = { AVALANCHE: avalanche, SNOWBALL: snowball, CUSTOM: custom };
  const active = results[strategy];
  const baseline = noExtraMonths?.[strategy];
  const baselineMeaningful = baseline != null && baseline < 1200;
  const monthsSaved = baselineMeaningful && active ? baseline - active.totalMonths : null;

  const plan = smartPlan?.plan;
  const hasDebt = recommendation.length > 0;

  return (
    <div>
      <div className="page-header">
        <h1>Yearly Debt Settlement Plan</h1>
      </div>

      {!smartPlan && <p className="empty-state">Loading your automatic plan…</p>}

      {smartPlan && !hasDebt && <p className="empty-state">No active debts to plan for yet — add one on the Debt page.</p>}

      {smartPlan && hasDebt && plan && (
        <div className="card" style={{ borderTop: "3px solid var(--brand)" }}>
          <h2>Your automatic debt-free plan</h2>
          <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 0 }}>{smartPlan.headline}</p>
          <div className="stat-row">
            <div className="stat-tile income">
              <span>Avg. monthly income (3 mo)</span>
              <strong>{formatCurrency(smartPlan.averageMonthlyIncome)}</strong>
            </div>
            <div className="stat-tile expense">
              <span>Avg. monthly expenses (3 mo)</span>
              <strong>{formatCurrency(smartPlan.averageMonthlyExpenses)}</strong>
            </div>
            <div className="stat-tile net">
              <span>Monthly surplus</span>
              <strong>{formatCurrency(smartPlan.monthlySurplus)}</strong>
            </div>
            <div className="stat-tile">
              <span>Extra going to debt/month</span>
              <strong>{formatCurrency(smartPlan.suggestedExtraPayment)}</strong>
            </div>
          </div>
          <div className="stat-row">
            <div className="stat-tile">
              <span>Strategy chosen for you</span>
              <strong style={{ fontSize: 16 }}>{STRATEGY_LABELS[smartPlan.chosenStrategy]}</strong>
            </div>
            <div className="stat-tile">
              <span>Debt-free date</span>
              <strong>{plan.payoffDate}</strong>
            </div>
            <div className="stat-tile">
              <span>Months saved vs. minimum-only</span>
              <strong>{smartPlan.monthsSaved > 0 ? smartPlan.monthsSaved : "—"}</strong>
            </div>
            <div className="stat-tile">
              <span>Interest saved</span>
              <strong>{formatCurrency(smartPlan.interestSaved)}</strong>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Debt</th>
                <th>Payoff month</th>
                <th>Interest paid</th>
              </tr>
            </thead>
            <tbody>
              {plan.debts.map((d) => (
                <tr key={d.debtId}>
                  <td>{d.name}</td>
                  <td>Month {d.payoffMonth}</td>
                  <td>{formatCurrency(d.interestPaid)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={plan.monthlySchedule} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--gridline)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => formatCompact(Number(v))} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={(m) => `Month ${m}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="totalRemainingBalance"
                name={STRATEGY_LABELS[smartPlan.chosenStrategy]}
                stroke="var(--series-1)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>

          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>
            This plan updates automatically as your income, expenses, and debt balances change — nothing here is
            saved until you record real payments on the Debt page.
          </p>
        </div>
      )}

      <div className="card">
        <h2>Why this order</h2>
        {recommendation.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Debt</th>
                <th>Balance</th>
                <th>Rate</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {recommendation.map((r) => (
                <tr key={r.debtId}>
                  <td>{r.rank}</td>
                  <td>{r.name}</td>
                  <td>{formatCurrency(r.currentBalance)}</td>
                  <td>{r.interestBearing && r.interestRate != null ? `${r.interestRate}%` : "Interest-free"}</td>
                  <td>{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">No active debts to plan for yet.</p>
        )}
      </div>

      <div className="more-details">
        <button type="button" className="ghost" onClick={openExplorer}>
          {exploreOpen ? "▾ Hide manual scenario explorer" : "▸ Explore other scenarios manually"}
        </button>
        {exploreOpen && (
          <div className="card" style={{ marginTop: 12 }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0 }}>
              The app already picked the strategy and extra payment above from your real cash flow. Use this only if
              you want to see what a different amount or ordering would do.
            </p>
            <div className="inline-form">
              <label>
                Additional monthly amount: ₹
                <input
                  type="number"
                  step="0.01"
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(e.target.value)}
                  style={{ width: 120, marginLeft: 6 }}
                />
              </label>
              {(["AVALANCHE", "SNOWBALL", "CUSTOM"] as PayoffStrategy[]).map((s) => (
                <label key={s} className="checkbox-label">
                  <input type="radio" name="strategy" checked={strategy === s} onChange={() => setStrategy(s)} />
                  {STRATEGY_LABELS[s]}
                </label>
              ))}
            </div>

            {active && active.totalMonths >= 1200 && (
              <p className="form-error">
                This plan never reaches payoff within 100 years — one or more active debts has no minimum payment or
                EMI set, and no extra payment is being simulated. Add a minimum payment/EMI on the debt itself, or
                enter an additional monthly amount above.
              </p>
            )}

            {active && (
              <>
                <div className="stat-row">
                  <div className="stat-tile">
                    <span>Debt-free date</span>
                    <strong>{active.payoffDate}</strong>
                  </div>
                  <div className="stat-tile">
                    <span>Months to debt-free</span>
                    <strong>{active.totalMonths}</strong>
                  </div>
                  <div className="stat-tile">
                    <span>Months saved vs. no extra payment</span>
                    <strong>
                      {monthsSaved != null ? monthsSaved : baseline != null && !baselineMeaningful ? "N/A*" : "—"}
                    </strong>
                  </div>
                  <div className="stat-tile">
                    <span>Total interest</span>
                    <strong>{formatCurrency(active.totalInterestPaid)}</strong>
                  </div>
                </div>

                {baseline != null && !baselineMeaningful && (
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    * Without any extra payment, one or more of these debts has no minimum payment/EMI set and would
                    never pay itself off, so "months saved" isn't a meaningful comparison here.
                  </p>
                )}

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Debt</th>
                      <th>Payoff month</th>
                      <th>Interest paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.debts.map((d) => (
                      <tr key={d.debtId}>
                        <td>{d.name}</td>
                        <td>Month {d.payoffMonth}</td>
                        <td>{formatCurrency(d.interestPaid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={active.monthlySchedule} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--gridline)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => formatCompact(Number(v))} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={(m) => `Month ${m}`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="totalRemainingBalance"
                      name={STRATEGY_LABELS[strategy]}
                      stroke="var(--series-1)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
