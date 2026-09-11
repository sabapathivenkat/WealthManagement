import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CategorySelect from "../components/CategorySelect";
import Confetti from "../components/Confetti";
import DatePicker from "../components/DatePicker";
import { useConfirm } from "../components/ConfirmProvider";
import TransactionLog from "../components/TransactionLog";
import { debtApi, transactionApi } from "../api/endpoints";
import type { Debt, DebtInput, Transaction } from "../api/types";
import { formatCurrency, today } from "../utils/format";

const emptyForm = {
  name: "",
  debtCategoryId: "",
  originalAmount: "",
  interestRate: "",
  emiAmount: "",
  minPayment: "",
  remainingMonths: "",
  startDate: today(),
  expectedEndDate: "",
  dueDay: "",
  interestBearing: true,
  priority: "",
  notes: "",
};

export default function DebtSection({ onChanged }: { onChanged?: () => void }) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryRefresh, setCategoryRefresh] = useState(0);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(today());
  const [payError, setPayError] = useState<string | null>(null);
  const [expandedDebtId, setExpandedDebtId] = useState<number | null>(null);
  const [historyByDebt, setHistoryByDebt] = useState<Record<number, Transaction[]>>({});
  const [celebrateDebtName, setCelebrateDebtName] = useState<string | null>(null);
  const confirm = useConfirm();

  async function loadHistory(debtId: number) {
    const all = await transactionApi.list();
    setHistoryByDebt((h) => ({ ...h, [debtId]: all.filter((t) => t.relatedDebtId === debtId) }));
  }

  function toggleHistory(debtId: number) {
    if (expandedDebtId === debtId) {
      setExpandedDebtId(null);
      return;
    }
    setExpandedDebtId(debtId);
    loadHistory(debtId);
  }

  async function load() {
    setDebts(await debtApi.list());
    onChanged?.();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name || !form.debtCategoryId || !form.originalAmount) {
      setError("Name, category and original amount are required");
      return;
    }
    const input: DebtInput = {
      name: form.name,
      debtCategoryId: Number(form.debtCategoryId),
      originalAmount: Number(form.originalAmount),
      interestRate: form.interestRate ? Number(form.interestRate) : undefined,
      emiAmount: form.emiAmount ? Number(form.emiAmount) : undefined,
      minPayment: form.minPayment ? Number(form.minPayment) : undefined,
      remainingMonths: form.remainingMonths ? Number(form.remainingMonths) : undefined,
      startDate: form.startDate,
      expectedEndDate: form.expectedEndDate || undefined,
      dueDay: form.dueDay ? Number(form.dueDay) : undefined,
      interestBearing: form.interestBearing,
      priority: form.priority ? Number(form.priority) : undefined,
      notes: form.notes || undefined,
    };
    try {
      if (editingId) {
        await debtApi.update(editingId, input);
      } else {
        await debtApi.create(input);
      }
      await load();
      resetForm();
      setCategoryRefresh((n) => n + 1);
    } catch {
      setError("Could not save debt");
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(d: Debt) {
    setEditingId(d.id);
    setForm({
      name: d.name,
      debtCategoryId: String(d.debtCategoryId),
      originalAmount: String(d.originalAmount),
      interestRate: d.interestRate != null ? String(d.interestRate) : "",
      emiAmount: d.emiAmount != null ? String(d.emiAmount) : "",
      minPayment: d.minPayment != null ? String(d.minPayment) : "",
      remainingMonths: d.remainingMonths != null ? String(d.remainingMonths) : "",
      startDate: d.startDate,
      expectedEndDate: d.expectedEndDate ?? "",
      dueDay: d.dueDay != null ? String(d.dueDay) : "",
      interestBearing: d.interestBearing,
      priority: d.priority != null ? String(d.priority) : "",
      notes: d.notes ?? "",
    });
  }

  async function handleDelete(id: number) {
    const ok = await confirm({
      title: "Delete this debt?",
      message: "This permanently removes it and its full payment history. This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    await debtApi.remove(id);
    await load();
  }

  function openPayment(id: number) {
    setPayingId(id);
    setPayAmount("");
    setPayDate(today());
    setPayError(null);
  }

  async function submitPayment(force = false) {
    if (!payingId || !payAmount) return;
    setPayError(null);
    try {
      const wasActive = debts.find((d) => d.id === payingId)?.status === "ACTIVE";
      const updated = await debtApi.recordPayment(payingId, { amount: Number(payAmount), txnDate: payDate, force });
      await load();
      setExpandedDebtId(payingId);
      await loadHistory(payingId);
      setPayingId(null);
      if (wasActive && updated.status === "CLOSED") {
        setCelebrateDebtName(updated.name);
      }
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (message?.includes("force=true")) {
        const ok = await confirm({ title: "Overpayment", message, confirmLabel: "Pay anyway", danger: true });
        if (ok) {
          await submitPayment(true);
          return;
        }
      }
      setPayError(message ?? "Could not record payment");
    }
  }

  return (
    <div>
      <h2>Debt</h2>

      {celebrateDebtName && (
        <>
          <Confetti onDone={() => setCelebrateDebtName(null)} />
          <p className="celebration-banner">🎉 {celebrateDebtName} is fully paid off — one debt down!</p>
        </>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Type</label>
            <CategorySelect
              kind="DEBT"
              value={form.debtCategoryId}
              onChange={(id) => setForm((f) => ({ ...f, debtCategoryId: id }))}
              refreshKey={categoryRefresh}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="debt-name">Debt name</label>
            <input
              id="debt-name"
              type="text"
              placeholder="e.g. Home Loan"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="debt-amount">Original amount (₹)</label>
            <input
              id="debt-amount"
              type="number"
              step="0.01"
              placeholder="0"
              value={form.originalAmount}
              onChange={(e) => setForm((f) => ({ ...f, originalAmount: e.target.value }))}
              required
            />
          </div>
          <div className="field checkbox">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.interestBearing}
                onChange={(e) => setForm((f) => ({ ...f, interestBearing: e.target.checked }))}
              />
              Interest-bearing
            </label>
          </div>
          {form.interestBearing && (
            <div className="field">
              <label htmlFor="debt-rate">Interest rate (% p.a.)</label>
              <input
                id="debt-rate"
                type="number"
                step="0.01"
                placeholder="e.g. 10.5"
                value={form.interestRate}
                onChange={(e) => setForm((f) => ({ ...f, interestRate: e.target.value }))}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="debt-start">Start date</label>
            <DatePicker id="debt-start" value={form.startDate} onChange={(v) => setForm((f) => ({ ...f, startDate: v }))} />
          </div>
        </div>

        <details className="more-details">
          <summary>More details (EMI, remaining months, due date, priority, notes)</summary>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="debt-emi">EMI amount (₹)</label>
              <input
                id="debt-emi"
                type="number"
                step="0.01"
                placeholder="Optional"
                value={form.emiAmount}
                onChange={(e) => setForm((f) => ({ ...f, emiAmount: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="debt-min-payment">Min payment (₹)</label>
              <input
                id="debt-min-payment"
                type="number"
                step="0.01"
                placeholder="Optional"
                value={form.minPayment}
                onChange={(e) => setForm((f) => ({ ...f, minPayment: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="debt-remaining">Remaining months</label>
              <input
                id="debt-remaining"
                type="number"
                placeholder="Optional"
                value={form.remainingMonths}
                onChange={(e) => setForm((f) => ({ ...f, remainingMonths: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="debt-end-date">Expected end date</label>
              <DatePicker
                id="debt-end-date"
                value={form.expectedEndDate}
                onChange={(v) => setForm((f) => ({ ...f, expectedEndDate: v }))}
              />
            </div>
            <div className="field">
              <label htmlFor="debt-due-day">Due day of month</label>
              <input
                id="debt-due-day"
                type="number"
                min={1}
                max={31}
                placeholder="1–31"
                value={form.dueDay}
                onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="debt-priority">Priority</label>
              <input
                id="debt-priority"
                type="number"
                placeholder="For custom strategy"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="debt-notes">Notes</label>
              <input
                id="debt-notes"
                type="text"
                placeholder="Optional"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
        </details>

        <div className="form-actions">
          <button type="submit">{editingId ? "Update debt" : "Add debt"}</button>
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
            <th>Name</th>
            <th>Type</th>
            <th>Original</th>
            <th>Outstanding</th>
            <th>Rate</th>
            <th>EMI / Min</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {debts.map((d) => (
            <Fragment key={d.id}>
              <tr>
                <td>{d.name}</td>
                <td>{d.debtCategoryName}</td>
                <td>{formatCurrency(d.originalAmount)}</td>
                <td className={d.currentBalance > 0 ? "amount-expense" : "amount-income"}>{formatCurrency(d.currentBalance)}</td>
                <td>{d.interestBearing && d.interestRate != null ? `${d.interestRate}%` : "Interest-free"}</td>
                <td>{formatCurrency(d.emiAmount ?? d.minPayment ?? 0)}</td>
                <td>{d.status}</td>
                <td className="row-actions">
                  {d.status === "ACTIVE" && <button onClick={() => openPayment(d.id)}>Record payment</button>}
                  <button className="ghost" onClick={() => toggleHistory(d.id)}>
                    {expandedDebtId === d.id ? "Hide history" : "History"}
                  </button>
                  <button className="ghost" onClick={() => startEdit(d)}>
                    Edit
                  </button>
                  <button className="ghost" onClick={() => handleDelete(d.id)}>
                    Delete
                  </button>
                </td>
              </tr>
              {expandedDebtId === d.id && (
                <tr>
                  <td colSpan={8} style={{ background: "var(--surface-2)" }}>
                    <TransactionLog
                      transactions={historyByDebt[d.id] ?? []}
                      onChanged={() => {
                        loadHistory(d.id);
                        load();
                      }}
                      emptyLabel="No payments recorded yet."
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {debts.length === 0 && (
            <tr>
              <td colSpan={8} className="empty-state">
                No debts added yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {payingId && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2>Record payment</h2>
          <div className="inline-form">
            <input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
            />
            <div style={{ width: 160 }}>
              <DatePicker value={payDate} onChange={setPayDate} />
            </div>
            <button onClick={() => submitPayment(false)}>Save</button>
            <button type="button" onClick={() => setPayingId(null)}>
              Cancel
            </button>
          </div>
          {payError && <p className="form-error">{payError}</p>}
        </div>
      )}

      {debts.some((d) => d.status === "ACTIVE") && (
        <p>
          <Link to="/debt-planner">See the yearly debt settlement plan →</Link>
        </p>
      )}
    </div>
  );
}
