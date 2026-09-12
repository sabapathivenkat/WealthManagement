import { useEffect, useState } from "react";
import { categoryApi } from "../api/endpoints";
import type { Category, CategoryKind } from "../api/types";
import { useConfirm } from "./ConfirmProvider";

export default function CategorySelect({
  kind,
  value,
  onChange,
  required,
  refreshKey,
  onPendingChange,
}: {
  kind: CategoryKind;
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
  refreshKey?: unknown;
  /** Fires true while the user is mid-way through creating/renaming a category (the picker
   * swaps to a name-input row) and false once that resolves — so the surrounding form can
   * disable its own Save/Add button and avoid the easy mistake of submitting with no
   * category selected because the new one was never actually confirmed. */
  onPendingChange?: (pending: boolean) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [archived, setArchived] = useState<Category[]>([]);
  const [mode, setMode] = useState<"view" | "adding" | "editing">("view");
  const [nameInput, setNameInput] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    onPendingChange?.(mode !== "view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function load() {
    setCategories(await categoryApi.list(kind));
  }

  async function loadArchived() {
    const all = await categoryApi.list(kind, true);
    setArchived(all.filter((c) => !c.active));
  }

  // A category created/renamed/archived/restored in one CategorySelect (e.g. the Budget
  // form's picker) needs to show up in every other CategorySelect of the same kind on the
  // same page (e.g. the Expense form's picker) without a full reload — there's no shared
  // store, so a plain window event is the simplest way to fan that out to every mounted instance.
  useEffect(() => {
    load();
    if (showArchived) loadArchived();

    function onChanged(e: Event) {
      const detail = (e as CustomEvent<{ kind: CategoryKind }>).detail;
      if (detail?.kind !== kind) return;
      load();
      if (showArchived) loadArchived();
    }
    window.addEventListener("categories-changed", onChanged);
    return () => window.removeEventListener("categories-changed", onChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, refreshKey, showArchived]);

  function notifyChanged() {
    window.dispatchEvent(new CustomEvent("categories-changed", { detail: { kind } }));
  }

  async function handleAdd() {
    if (!nameInput.trim()) return;
    const created = await categoryApi.create({ name: nameInput.trim(), kind });
    await load();
    notifyChanged();
    onChange(String(created.id));
    setNameInput("");
    setMode("view");
  }

  async function handleRename() {
    if (!value || !nameInput.trim()) return;
    await categoryApi.update(Number(value), { name: nameInput.trim(), kind });
    await load();
    notifyChanged();
    setNameInput("");
    setMode("view");
  }

  async function handleRemove() {
    if (!value) return;
    const ok = await confirm({
      title: "Remove category?",
      message: "It stays on any past entries but won't be offered for new ones.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    await categoryApi.archive(Number(value));
    await load();
    notifyChanged();
    if (showArchived) await loadArchived();
    onChange("");
  }

  async function handleRestore(id: number) {
    await categoryApi.restore(id);
    await load();
    notifyChanged();
    await loadArchived();
  }

  function startRename() {
    const current = categories.find((c) => String(c.id) === value);
    setNameInput(current?.name ?? "");
    setMode("editing");
  }

  async function toggleArchived() {
    const next = !showArchived;
    setShowArchived(next);
    if (next) await loadArchived();
  }

  if (mode === "adding" || mode === "editing") {
    return (
      <div className="category-select">
        <div className="category-select-row">
          <input
            type="text"
            autoFocus
            placeholder={mode === "adding" ? "New category name" : "Rename category"}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                mode === "adding" ? handleAdd() : handleRename();
              }
            }}
          />
        </div>
        <div className="category-select-toolbar">
          <button type="button" onClick={mode === "adding" ? handleAdd : handleRename}>
            {mode === "adding" ? "Create category" : "Save name"}
          </button>
          <button type="button" className="ghost" onClick={() => setMode("view")}>
            Cancel
          </button>
        </div>
        <p className="category-select-hint">
          {mode === "adding"
            ? `Click "Create category" (or press Enter) first — the form below won't submit until this is done.`
            : `Click "Save name" (or press Enter) to confirm the rename.`}
        </p>
      </div>
    );
  }

  return (
    <div className="category-select">
      <div className="category-select-row">
        <select value={value} onChange={(e) => onChange(e.target.value)} required={required}>
          <option value="">Category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="category-select-toolbar">
        <button type="button" className="ghost" onClick={() => { setNameInput(""); setMode("adding"); }} title="Add a new category">
          + New
        </button>
        {value && (
          <button type="button" className="ghost" onClick={startRename} title="Rename this category">
            Edit
          </button>
        )}
        {value && (
          <button type="button" className="ghost" onClick={handleRemove} title="Remove this category">
            Remove
          </button>
        )}
        <button type="button" className="ghost" onClick={toggleArchived} title="Show removed categories">
          {showArchived ? "Hide removed" : "Removed…"}
        </button>
      </div>
      {showArchived && (
        <div className="category-select-archived">
          {archived.length === 0 && <span>No removed categories.</span>}
          {archived.map((c) => (
            <span key={c.id}>
              {c.name}{" "}
              <button type="button" className="ghost" onClick={() => handleRestore(c.id)}>
                Restore
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
