import { Fragment, useEffect, useState } from "react";
import CategorySelect from "../components/CategorySelect";
import DatePicker from "../components/DatePicker";
import { useConfirm } from "../components/ConfirmProvider";
import TransactionLog from "../components/TransactionLog";
import { savingsApi, transactionApi } from "../api/endpoints";
import type { SavingsAccount, Transaction } from "../api/types";
import { formatCurrency, today } from "../utils/format";

const emptyForm = { name: "", categoryId: "", initialValue: "", startDate: today(), notes: "" };

export default function SavingsSection({ onChanged }: { onChanged?: () => void }) {
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryRefresh, setCategoryRefresh] = useState(0);
  const [txnFor, setTxnFor] = useState<{ id: number; mode: "contribute" | "withdraw" } | null>(null);
  const [txnAmount, setTxnAmount] = useState("");
  const [txnDate, setTxnDate] = useState(today());
  const [txnError, setTxnError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [historyByAccount, setHistoryByAccount] = useState<Record<number, Transaction[]>>({});
  const confirm = useConfirm();

  async function loadHistory(accountId: number) {
    const all = await transactionApi.list();
    setHistoryByAccount((h) => ({ ...h, [accountId]: all.filter((t) => t.relatedSavingsAccountId === accountId) }));
  }

  function toggleHistory(accountId: number) {
    if (expandedId === accountId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(accountId);
    loadHistory(accountId);
  }

  async function load() {
    setAccounts(await savingsApi.list());
    onChanged?.();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name || !form.categoryId) {
      setError("Name and category are required");
      return;
    }
    const input = {
      name: form.name,
      categoryId: Number(form.categoryId),
      initialValue: Number(form.initialValue) || 0,
      startDate: form.startDate || undefined,
      notes: form.notes || undefined,
    };
    try {
      if (editingId) {
        await savingsApi.update(editingId, input);
      } else {
        await savingsApi.create(input);
      }
      await load();
      resetForm();
      setCategoryRefresh((n) => n + 1);
    } catch {
      setError("Could not save savings account");
    }
  }

  function startEdit(a: SavingsAccount) {
    setEditingId(a.id);
    setForm({
      name: a.name,
      categoryId: String(a.categoryId),
      initialValue: String(a.initialValue),
      startDate: a.startDate ?? today(),
      notes: a.notes ?? "",
    });
  }

  async function handleArchive(id: number) {
    await savingsApi.archive(id);
    await load();
  }

  async function handleDelete(id: number) {
    const ok = await confirm({
      title: "Delete this account?",
      message: "This permanently removes it and all its contribution/withdrawal history. This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    await savingsApi.remove(id);
    await load();
  }

  async function handleUnarchive(id: number) {
    await savingsApi.unarchive(id);
    await load();
  }

  function openTxn(id: number, mode: "contribute" | "withdraw") {
    setTxnFor({ id, mode });
    setTxnAmount("");
    setTxnDate(today());
    setTxnError(null);
  }

  async function submitTxn(force = false) {
    if (!txnFor || !txnAmount) return;
    setTxnError(null);
    const input = { amount: Number(txnAmount), txnDate, force };
    try {
      if (txnFor.mode === "contribute") {
        await savingsApi.contribute(txnFor.id, input);
      } else {
        await savingsApi.withdraw(txnFor.id, input);
      }
      await load();
      setExpandedId(txnFor.id);
      await loadHistory(txnFor.id);
      setTxnFor(null);
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (message?.includes("force=true")) {
        const ok = await confirm({ title: "Overdraft", message, confirmLabel: "Proceed anyway", danger: true });
        if (ok) {
          await submitTxn(true);
          return;
        }
      }
      setTxnError(message ?? "Could not save transaction");
    }
  }

  const totalCurrent = accounts.filter((a) => a.active).reduce((s, a) => s + a.currentValue, 0);

  return (
    <div>
      <h2>Savings &amp; Investments</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Category</label>
            <CategorySelect
              kind="SAVINGS"
              value={form.categoryId}
              onChange={(id) => setForm((f) => ({ ...f, categoryId: id }))}
              refreshKey={categoryRefresh}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="savings-name">Account name</label>
            <input
              id="savings-name"
              type="text"
              placeholder="e.g. HDFC Mutual Fund"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="savings-value">Current value (₹)</label>
            <input
              id="savings-value"
              type="number"
              step="0.01"
              placeholder="0"
              value={form.initialValue}
              onChange={(e) => setForm((f) => ({ ...f, initialValue: e.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="savings-start">Start date</label>
            <DatePicker id="savings-start" value={form.startDate} onChange={(v) => setForm((f) => ({ ...f, startDate: v }))} />
          </div>
          <div className="field">
            <label htmlFor="savings-notes">Notes</label>
            <input
              id="savings-notes"
              type="text"
              placeholder="Optional"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
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
            <th>Name</th>
            <th>Category</th>
            <th>Opening</th>
            <th>Current</th>
            <th>% of total</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <Fragment key={a.id}>
              <tr>
                <td>{a.name}</td>
                <td>{a.categoryName}</td>
                <td>{formatCurrency(a.initialValue)}</td>
                <td className="amount-income">{formatCurrency(a.currentValue)}</td>
                <td>{a.active && totalCurrent > 0 ? ((a.currentValue / totalCurrent) * 100).toFixed(1) : "0.0"}%</td>
                <td>{a.active ? "Active" : "Archived"}</td>
                <td className="row-actions">
                  <button className="ghost" onClick={() => startEdit(a)}>
                    Edit
                  </button>
                  <button onClick={() => openTxn(a.id, "contribute")}>Contribute</button>
                  <button onClick={() => openTxn(a.id, "withdraw")}>Withdraw</button>
                  <button className="ghost" onClick={() => toggleHistory(a.id)}>
                    {expandedId === a.id ? "Hide history" : "History"}
                  </button>
                  {a.active ? (
                    <button className="ghost" onClick={() => handleArchive(a.id)}>
                      Archive
                    </button>
                  ) : (
                    <button className="ghost" onClick={() => handleUnarchive(a.id)}>
                      Unarchive
                    </button>
                  )}
                  <button className="ghost" onClick={() => handleDelete(a.id)}>
                    Delete
                  </button>
                </td>
              </tr>
              {expandedId === a.id && (
                <tr>
                  <td colSpan={7} style={{ background: "var(--surface-2)" }}>
                    <TransactionLog
                      transactions={historyByAccount[a.id] ?? []}
                      onChanged={() => {
                        loadHistory(a.id);
                        load();
                      }}
                      emptyLabel="No contributions or withdrawals recorded yet."
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {accounts.length === 0 && (
            <tr>
              <td colSpan={7} className="empty-state">
                No savings accounts yet — add your current savings above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
        Archived accounts are excluded from your net worth and totals, but keep their history.
      </p>

      {txnFor && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2>{txnFor.mode === "contribute" ? "Add contribution" : "Record withdrawal"}</h2>
          <div className="inline-form">
            <input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={txnAmount}
              onChange={(e) => setTxnAmount(e.target.value)}
              required
            />
            <div style={{ width: 160 }}>
              <DatePicker value={txnDate} onChange={setTxnDate} />
            </div>
            <button onClick={() => submitTxn(false)}>Save</button>
            <button type="button" onClick={() => setTxnFor(null)}>
              Cancel
            </button>
          </div>
          {txnError && <p className="form-error">{txnError}</p>}
        </div>
      )}
    </div>
  );
}
