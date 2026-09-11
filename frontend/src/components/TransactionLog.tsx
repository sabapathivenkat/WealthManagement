import { useState } from "react";
import { transactionApi } from "../api/endpoints";
import type { Transaction, TransactionType } from "../api/types";
import { useConfirm } from "./ConfirmProvider";
import DatePicker from "./DatePicker";
import { formatCurrency } from "../utils/format";

const TYPE_LABELS: Partial<Record<TransactionType, string>> = {
  SAVINGS_CONTRIBUTION: "Contribution",
  SAVINGS_WITHDRAWAL: "Withdrawal",
  DEBT_PAYMENT: "Payment",
  DEBT_ADJUSTMENT: "Adjustment",
  ASSET_ADJUSTMENT: "Adjustment",
};

export default function TransactionLog({
  transactions,
  onChanged,
  emptyLabel = "No entries recorded yet.",
}: {
  transactions: Transaction[];
  onChanged: () => void;
  emptyLabel?: string;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [txnDate, setTxnDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  function startEdit(t: Transaction) {
    setEditingId(t.id);
    setAmount(String(t.amount));
    setTxnDate(t.txnDate);
    setNote(t.note ?? "");
    setError(null);
  }

  async function saveEdit(t: Transaction, force = false) {
    setError(null);
    try {
      await transactionApi.update(t.id, {
        categoryId: t.categoryId,
        relatedSavingsAccountId: t.relatedSavingsAccountId,
        relatedDebtId: t.relatedDebtId,
        amount: Number(amount),
        type: t.type,
        txnDate,
        note: note || undefined,
        isRecurring: t.isRecurring,
        force,
      });
      setEditingId(null);
      onChanged();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (message?.includes("force=true")) {
        const ok = await confirm({ title: "Exceeds balance", message, confirmLabel: "Save anyway", danger: true });
        if (ok) {
          await saveEdit(t, true);
          return;
        }
      }
      setError(message ?? "Could not save changes");
    }
  }

  async function handleDelete(id: number) {
    const ok = await confirm({
      title: "Delete this entry?",
      message: "This removes it from the ledger and recalculates the balance. This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    await transactionApi.remove(id);
    onChanged();
  }

  if (transactions.length === 0) {
    return <p className="empty-state">{emptyLabel}</p>;
  }

  return (
    <>
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Note</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) =>
            editingId === t.id ? (
              <tr key={t.id}>
                <td>
                  <div style={{ width: 140 }}>
                    <DatePicker value={txnDate} onChange={setTxnDate} />
                  </div>
                </td>
                <td>{TYPE_LABELS[t.type] ?? t.type}</td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ width: 100 }}
                  />
                </td>
                <td>
                  <input type="text" value={note} onChange={(e) => setNote(e.target.value)} style={{ width: 140 }} />
                </td>
                <td className="row-actions">
                  <button onClick={() => saveEdit(t)}>Save</button>
                  <button className="ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </td>
              </tr>
            ) : (
              <tr key={t.id}>
                <td>{t.txnDate}</td>
                <td>{TYPE_LABELS[t.type] ?? t.type}</td>
                <td>{formatCurrency(t.amount)}</td>
                <td>{t.note}</td>
                <td className="row-actions">
                  <button className="ghost" onClick={() => startEdit(t)}>
                    Edit
                  </button>
                  <button className="ghost" onClick={() => handleDelete(t.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
      {error && <p className="form-error">{error}</p>}
    </>
  );
}
