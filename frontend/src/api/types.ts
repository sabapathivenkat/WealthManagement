export type TransactionType =
  | "INCOME"
  | "EXPENSE"
  | "SAVINGS_CONTRIBUTION"
  | "SAVINGS_WITHDRAWAL"
  | "DEBT_PAYMENT"
  | "DEBT_ADJUSTMENT"
  | "ASSET_ADJUSTMENT";
export type CategoryKind = "INCOME" | "EXPENSE" | "SAVINGS" | "DEBT" | "YEARLY_EXPENSE";
export type BudgetPeriod = "MONTH" | "YEAR";
export type PayoffStrategy = "AVALANCHE" | "SNOWBALL" | "CUSTOM";
export type DebtStatus = "ACTIVE" | "CLOSED";

export interface AuthResponse {
  token: string;
  email: string;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  kind: CategoryKind;
  isDefault: boolean;
  active: boolean;
}

export interface CategoryInput {
  name: string;
  kind: CategoryKind;
}

export interface Transaction {
  id: number;
  categoryId?: number;
  categoryName?: string;
  relatedSavingsAccountId?: number;
  relatedSavingsAccountName?: string;
  relatedDebtId?: number;
  relatedDebtName?: string;
  amount: number;
  type: TransactionType;
  txnDate: string;
  note?: string;
  isRecurring: boolean;
}

export interface TransactionInput {
  categoryId?: number;
  relatedSavingsAccountId?: number;
  relatedDebtId?: number;
  amount: number;
  type: TransactionType;
  txnDate: string;
  note?: string;
  isRecurring?: boolean;
  force?: boolean;
}

export interface CategoryBreakdown {
  categoryId: number;
  categoryName: string;
  amount: number;
}

export interface Summary {
  from: string;
  to: string;
  totalIncome: number;
  totalExpense: number;
  net: number;
  byCategory: CategoryBreakdown[];
}

export interface Budget {
  id: number;
  categoryId: number;
  categoryName: string;
  period: BudgetPeriod;
  periodValue: string;
  plannedAmount: number;
  actualAmount: number;
}

export interface BudgetInput {
  categoryId: number;
  period: BudgetPeriod;
  periodValue: string;
  plannedAmount: number;
}

export interface SavingsAccount {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  initialValue: number;
  currentValue: number;
  startDate?: string;
  notes?: string;
  active: boolean;
}

export interface SavingsAccountInput {
  name: string;
  categoryId: number;
  initialValue: number;
  startDate?: string;
  notes?: string;
}

export interface ContributionInput {
  amount: number;
  txnDate: string;
  note?: string;
  force?: boolean;
}

export interface Debt {
  id: number;
  name: string;
  debtCategoryId: number;
  debtCategoryName: string;
  originalAmount: number;
  currentBalance: number;
  interestRate?: number;
  emiAmount?: number;
  minPayment?: number;
  remainingMonths?: number;
  startDate: string;
  expectedEndDate?: string;
  dueDay?: number;
  interestBearing: boolean;
  priority?: number;
  notes?: string;
  status: DebtStatus;
}

export interface DebtInput {
  name: string;
  debtCategoryId: number;
  originalAmount: number;
  interestRate?: number;
  emiAmount?: number;
  minPayment?: number;
  remainingMonths?: number;
  startDate: string;
  expectedEndDate?: string;
  dueDay?: number;
  interestBearing: boolean;
  priority?: number;
  notes?: string;
}

export interface PaymentInput {
  amount: number;
  txnDate: string;
  note?: string;
  force?: boolean;
}

export interface DebtPayoffDetail {
  debtId: number;
  name: string;
  payoffMonth: number;
  interestPaid: number;
}

export interface MonthlyPoint {
  month: number;
  totalRemainingBalance: number;
}

export interface StrategyResult {
  strategy: PayoffStrategy;
  totalMonths: number;
  totalInterestPaid: number;
  payoffDate: string;
  debts: DebtPayoffDetail[];
  monthlySchedule: MonthlyPoint[];
}

export interface PayoffComparison {
  avalanche: StrategyResult;
  snowball: StrategyResult;
}

export interface DebtRecommendation {
  rank: number;
  debtId: number;
  name: string;
  currentBalance: number;
  interestRate?: number;
  interestBearing: boolean;
  reason: string;
}

export interface SmartPlanResponse {
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  monthlySurplus: number;
  suggestedExtraPayment: number;
  chosenStrategy: PayoffStrategy;
  baseline: StrategyResult;
  plan: StrategyResult;
  monthsSaved: number;
  interestSaved: number;
  headline: string;
  priority: DebtRecommendation[];
}

export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  targetDate: string;
  currentAmount: number;
}

export interface GoalInput {
  name: string;
  targetAmount: number;
  targetDate: string;
  currentAmount: number;
}

export interface GoalProgress {
  remainingAmount: number;
  monthsRemaining: number;
  requiredMonthlySaving: number;
  percentComplete: number;
}

export interface TrendPoint {
  month: string;
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
  income: number;
  expense: number;
  savingsContributions: number;
  debtPayments: number;
}

export interface AllocationSlice {
  label: string;
  amount: number;
}

export interface DashboardResponse {
  month: string;
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  savingsRate: number;
  savingsContributionsThisMonth: number;
  debtPaidThisMonth: number;
  remainingDebt: number;
  estimatedDebtFreeDate?: string;
  expenseRatio: number;
  debtToIncomeRatio: number;
  emergencyFundCoverageMonths: number;
  trend: TrendPoint[];
  expenseByCategory: CategoryBreakdown[];
  savingsAllocation: AllocationSlice[];
}

export interface YearlySummaryResponse {
  year: number;
  totalIncome: number;
  totalExpenses: number;
  totalSavingsContributions: number;
  totalDebtRepaid: number;
  beginningAssets: number;
  endingAssets: number;
  beginningDebt: number;
  endingDebt: number;
  netWorthGrowth: number;
  savingsRate: number;
  debtReductionPercent: number;
  months: TrendPoint[];
}

export interface UserSettings {
  currency: string;
  fyStartMonth: number;
  defaultDebtStrategy: PayoffStrategy;
}
