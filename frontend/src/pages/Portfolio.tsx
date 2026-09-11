import { useEffect, useState } from "react";
import { debtApi, savingsApi } from "../api/endpoints";
import SavingsSection from "./SavingsSection";
import DebtSection from "./DebtSection";
import { formatCurrency } from "../utils/format";

export default function Portfolio() {
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);

  async function loadTotals() {
    const [savings, debts] = await Promise.all([savingsApi.list(), debtApi.list()]);
    setTotalAssets(savings.filter((a) => a.active).reduce((s, a) => s + a.currentValue, 0));
    setTotalDebt(debts.reduce((s, d) => s + d.currentBalance, 0));
  }

  useEffect(() => {
    loadTotals();
  }, []);

  const netWorth = totalAssets - totalDebt;

  return (
    <div>
      <div className="page-header">
        <h1>Debt, Savings &amp; Investments</h1>
      </div>

      <div className="stat-row">
        <div className="stat-tile">
          <span>Total Savings / Investments</span>
          <strong>{formatCurrency(totalAssets)}</strong>
        </div>
        <div className="stat-tile">
          <span>Total Outstanding Debt</span>
          <strong>{formatCurrency(totalDebt)}</strong>
        </div>
        <div className={`stat-tile ${netWorth >= 0 ? "income" : "expense"}`}>
          <span>Net Worth</span>
          <strong>{formatCurrency(netWorth)}</strong>
        </div>
      </div>

      <div className="card">
        <SavingsSection onChanged={loadTotals} />
      </div>
      <div className="card">
        <DebtSection onChanged={loadTotals} />
      </div>
    </div>
  );
}
