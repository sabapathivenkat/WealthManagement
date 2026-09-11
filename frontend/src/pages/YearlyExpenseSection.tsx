import { useEffect, useState } from "react";
import CategorySelect from "../components/CategorySelect";
import DatePicker from "../components/DatePicker";
import { categoryApi, transactionApi } from "../api/endpoints";
import type { Transaction } from "../api/types";
import { formatCurrency, today } from "../utils/format";

export default function YearlyExpenseSection() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [entries, setEntries] = useState<Transaction[]>([]);
  const [form, setForm] = useState({ categoryId: "", amount: "", txnDate: today(), note: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryRefresh, setCategoryRefresh] = useState(0);

  async function load() {
    const categories = await categoryApi.list("YEARLY_EXPENSE");
    const ids = new Set(categories.map((c) => c.id));
    const all = await transactionApi.list(`${year}-01-01`, `${year}-12-31`);
    setEntries(all.filter((t) => t.type === "EXPENSE" && t.categoryId != null && ids.has(t.categoryId)));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

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
      type: "EXPENSE" as const,
      txnDate: form.txnDate,
      note: form.note || undefined,
    };
    try {
      if (editingId) {
        await transactionApi.update(editingId, input);
      } else {
        await transactionApi.create(input);
      }
      await load();
      resetForm();
      setCategoryRefresh((n) => n + 1);
    } catch {
      setError("Could not save yearly expense");
    }
  }

  function startEdit(t: Transaction) {
    setEditingId(t.id);
    setForm({ categoryId: String(t.categoryId), amount: String(t.amount), txnDate: t.txnDate, note: t.note ?? "" });
  }

  async function handleDelete(id: number) {
    await transactionApi.remove(id);
    setEntries((prev) => prev.filter((t) => t.id !== id));
  }

  const total = entries.reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      <div className="page-header">
        <h2>Yearly Expenses</h2>
        <div className="period-controls">
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 90 }} />
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-tile expense">
          <span>Total this year</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Category</label>
            <CategorySelect
              kind="YEARLY_EXPENSE"
              value={form.categoryId}
              onChange={(id) => setForm((f) => ({ ...f, categoryId: id }))}
              refreshKey={categoryRefresh}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="yearly-amount">Amount (₹)</label>
            <input
              id="yearly-amount"
              type="number"
              step="0.01"
              placeholder="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="yearly-date">Date</label>
            <DatePicker id="yearly-date" value={form.txnDate} onChange={(v) => setForm((f) => ({ ...f, txnDate: v }))} />
          </div>
          <div className="field">
            <label htmlFor="yearly-note">Note</label>
            <input
              id="yearly-note"
              type="text"
              placeholder="Optional"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit">{editingId ? "Update" : "Add"}</button>
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
            <th>Date</th>
            <th>Category</th>
            <th>Note</th>
            <th>Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((t) => (
            <tr key={t.id}>
              <td>{t.txnDate}</td>
              <td>{t.categoryName}</td>
              <td>{t.note}</td>
              <td className="amount-expense">{formatCurrency(t.amount)}</td>
              <td className="row-actions">
                <button onClick={() => startEdit(t)}>Edit</button>
                <button onClick={() => handleDelete(t.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={5} className="empty-state">
                No yearly expenses recorded for {year} yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
