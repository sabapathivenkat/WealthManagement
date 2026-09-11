import { useState } from "react";
import IncomeExpensePage from "./IncomeExpensePage";
import BudgetSection from "./BudgetSection";
import YearlyExpenseSection from "./YearlyExpenseSection";
import MonthPicker from "../components/MonthPicker";
import { currentMonth } from "../utils/format";

export default function MonthlyPlan() {
  const [month, setMonth] = useState(currentMonth());

  return (
    <div>
      <div className="page-header">
        <h1>Monthly Income &amp; Expense Budget</h1>
        <div style={{ width: 200 }}>
          <MonthPicker value={month} onChange={(v) => v && setMonth(v)} />
        </div>
      </div>

      <div className="card">
        <IncomeExpensePage type="INCOME" month={month} embedded />
      </div>
      <div className="card">
        <IncomeExpensePage type="EXPENSE" month={month} embedded />
      </div>
      <div className="card">
        <BudgetSection month={month} />
      </div>
      <div className="card">
        <YearlyExpenseSection />
      </div>
    </div>
  );
}
