import { useEffect, useMemo, useState } from "react";
import CategorySelect from "../components/CategorySelect";
import DatePicker from "../components/DatePicker";
import { transactionApi } from "../api/endpoints";
import type { Transaction, TransactionType } from "../api/types";
import { formatCurrency, monthBounds, today } from "../utils/format";

export default function IncomeExpensePage({
  type,
  month,
  embedded,
}: {
  type: Extract<TransactionType, "INCOME" | "EXPENSE">;
  month: string;
  embedded?: boolean;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prevTotal, setPrevTotal] = useState(0);
  const [form, setForm] = useState({ categoryId: "", amount: "", txnDate: today(), note: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryRefresh, setCategoryRefresh] = useState(0);
  const [categoryPending, setCategoryPending] = useState(false);

  const [from, to] = useMemo(() => monthBounds(month), [month]);

  useEffect(() => {
    transactionApi.list(from, to).then((all) => setTransactions(all.filter((t) => t.type === type)));

    const [py, pm] = month.split("-").map(Number);
    const prevMonth = pm === 1 ? `${py - 1}-12` : `${py}-${String(pm - 1).padStart(2, "0")}`;
    const [pFrom, pTo] = monthBounds(prevMonth);
    transactionApi
      .list(pFrom, pTo)
      .then((all) => setPrevTotal(all.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0)));
  }, [from, to, type, month]);

  function resetForm() {
    setForm({ categoryId: "", amount: "", txnDate: today(), note: "" });
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.categoryId || !form.amount) {
      setError("Category and amount are required");
      return;
    }
    const input = {
      categoryId: Number(form.categoryId),
      amount: Number(form.amount),
      type,
      txnDate: form.txnDate,
      note: form.note || undefined,
    };
    try {
      if (editingId) {
        await transactionApi.update(editingId, input);
      } else {
        await transactionApi.create(input);
      }
      const updated = await transactionApi.list(from, to);
      setTransactions(updated.filter((t) => t.type === type));
      resetForm();
      setCategoryRefresh((n) => n + 1);
    } catch {
      setError(`Could not save ${type === "INCOME" ? "income" : "expense"}`);
    }
  }

  function startEdit(t: Transaction) {
    setEditingId(t.id);
    setForm({ categoryId: String(t.categoryId), amount: String(t.amount), txnDate: t.txnDate, note: t.note ?? "" });
  }

  async function handleDelete(id: number) {
    await transactionApi.remove(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  const total = transactions.reduce((s, t) => s + t.amount, 0);
  const largest = transactions.reduce((max, t) => (t.amount > (max?.amount ?? 0) ? t : max), null as Transaction | null);
  const byCategory = new Map<string, number>();
  transactions.forEach((t) => byCategory.set(t.categoryName ?? "Unknown", (byCategory.get(t.categoryName ?? "Unknown") ?? 0) + t.amount));
  const categoryRows = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const label = type === "INCOME" ? "Income" : "Expenses";

  return (
    <div>
      {!embedded && (
        <div className="page-header">
          <h1>{label}</h1>
        </div>
      )}
      {embedded && <h2>{label}</h2>}

      <div className="stat-row">
        <div className={`stat-tile ${type === "INCOME" ? "income" : "expense"}`}>
          <span>Total this month</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
        <div className="stat-tile">
          <span>Previous month</span>
          <strong>{formatCurrency(prevTotal)}</strong>
        </div>
        <div className="stat-tile">
          <span>Largest entry</span>
          <strong>{largest ? formatCurrency(largest.amount) : "—"}</strong>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Category</label>
            <CategorySelect
              kind={type}
              value={form.categoryId}
              onChange={(id) => setForm((f) => ({ ...f, categoryId: id }))}
              refreshKey={categoryRefresh}
              onPendingChange={setCategoryPending}
              required
            />
          </div>
          <div className="field">
            <label htmlFor={`${type}-amount`}>Amount (₹)</label>
            <input
              id={`${type}-amount`}
              type="number"
              step="0.01"
              placeholder="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label htmlFor={`${type}-date`}>Date</label>
            <DatePicker id={`${type}-date`} value={form.txnDate} onChange={(v) => setForm((f) => ({ ...f, txnDate: v }))} />
          </div>
          <div className="field">
            <label htmlFor={`${type}-note`}>Note</label>
            <input
              id={`${type}-note`}
              type="text"
              placeholder="Optional"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" disabled={categoryPending}>
            {editingId ? "Update" : "Add"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>
      {error && <p className="form-error">{error}</p>}

      <div className="dashboard-grid">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Note</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>{t.txnDate}</td>
                <td>{t.categoryName}</td>
                <td>{t.note}</td>
                <td className={type === "INCOME" ? "amount-income" : "amount-expense"}>{formatCurrency(t.amount)}</td>
                <td className="row-actions">
                  <button onClick={() => startEdit(t)}>Edit</button>
                  <button onClick={() => handleDelete(t.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">
                  No entries for this month yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="card">
          <h2>By category</h2>
          {categoryRows.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {categoryRows.map(([name, amount]) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>{name}</span>
                  <span>{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
