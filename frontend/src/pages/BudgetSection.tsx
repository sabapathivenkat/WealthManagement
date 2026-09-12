import { useEffect, useState } from "react";
import CategorySelect from "../components/CategorySelect";
import { budgetApi } from "../api/endpoints";
import type { Budget, BudgetPeriod } from "../api/types";
import { formatCurrency } from "../utils/format";

export default function BudgetSection({ month }: { month: string }) {
  const [period, setPeriod] = useState<BudgetPeriod>("MONTH");
  const [periodValue, setPeriodValue] = useState(month);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [plannedAmount, setPlannedAmount] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryRefresh, setCategoryRefresh] = useState(0);
  const [categoryPending, setCategoryPending] = useState(false);

  useEffect(() => {
    if (period === "MONTH") setPeriodValue(month);
  }, [month, period]);

  useEffect(() => {
    budgetApi.list(period, periodValue).then(setBudgets);
  }, [period, periodValue]);

  function handlePeriodChange(next: BudgetPeriod) {
    setPeriod(next);
    setPeriodValue(next === "MONTH" ? month : String(new Date().getFullYear()));
  }

  function resetForm() {
    setCategoryId("");
    setPlannedAmount("");
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoryId || !plannedAmount) {
      setError("Category and planned amount are required");
      return;
    }
    const input = { categoryId: Number(categoryId), period, periodValue, plannedAmount: Number(plannedAmount) };
    try {
      if (editingId) {
        await budgetApi.update(editingId, input);
      } else {
        await budgetApi.create(input);
      }
      setBudgets(await budgetApi.list(period, periodValue));
      resetForm();
      setCategoryRefresh((n) => n + 1);
    } catch {
      setError("Could not save budget (it may already exist for this category/period)");
    }
  }

  function startEdit(b: Budget) {
    setEditingId(b.id);
    setCategoryId(String(b.categoryId));
    setPlannedAmount(String(b.plannedAmount));
  }

  async function handleDelete(id: number) {
    await budgetApi.remove(id);
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div>
      <div className="page-header">
        <h2>Budget</h2>
        <div className="period-controls">
          <select value={period} onChange={(e) => handlePeriodChange(e.target.value as BudgetPeriod)}>
            <option value="MONTH">Monthly</option>
            <option value="YEAR">Yearly</option>
          </select>
          {period === "YEAR" && (
            <input type="number" value={periodValue} onChange={(e) => setPeriodValue(e.target.value)} placeholder="YYYY" />
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Category</label>
            <CategorySelect
              kind="EXPENSE"
              value={categoryId}
              onChange={setCategoryId}
              refreshKey={categoryRefresh}
              onPendingChange={setCategoryPending}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="budget-amount">Planned amount (₹)</label>
            <input
              id="budget-amount"
              type="number"
              step="0.01"
              placeholder="0"
              value={plannedAmount}
              onChange={(e) => setPlannedAmount(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" disabled={categoryPending}>
            {editingId ? "Update budget" : "Set budget"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>
      {error && <p className="form-error">{error}</p>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Planned</th>
            <th>Actual</th>
            <th>Remaining</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {budgets.map((b) => {
            const remaining = b.plannedAmount - b.actualAmount;
            const overBudget = remaining < 0;
            return (
              <tr key={b.id}>
                <td>{b.categoryName}</td>
                <td>{formatCurrency(b.plannedAmount)}</td>
                <td>{formatCurrency(b.actualAmount)}</td>
                <td className={overBudget ? "amount-expense" : "amount-income"}>{formatCurrency(remaining)}</td>
                <td className="row-actions">
                  <button onClick={() => startEdit(b)}>Edit</button>
                  <button onClick={() => handleDelete(b.id)}>Delete</button>
                </td>
              </tr>
            );
          })}
          {budgets.length === 0 && (
            <tr>
              <td colSpan={5} className="empty-state">
                No budgets set for this period yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
