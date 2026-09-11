import { api } from "./client";
import type {
  AuthResponse,
  Budget,
  BudgetInput,
  BudgetPeriod,
  Category,
  CategoryInput,
  CategoryKind,
  ContributionInput,
  DashboardResponse,
  Debt,
  DebtInput,
  DebtRecommendation,
  Goal,
  GoalInput,
  GoalProgress,
  PayoffComparison,
  PaymentInput,
  SavingsAccount,
  SavingsAccountInput,
  SmartPlanResponse,
  StrategyResult,
  Summary,
  Transaction,
  TransactionInput,
  UserSettings,
  YearlySummaryResponse,
} from "./types";

export const authApi = {
  signup: (email: string, password: string, name: string) =>
    api.post<AuthResponse>("/auth/signup", { email, password, name }).then((r) => r.data),
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }).then((r) => r.data),
};

export const categoryApi = {
  list: (kind?: CategoryKind, includeInactive?: boolean) =>
    api.get<Category[]>("/categories", { params: { kind, includeInactive } }).then((r) => r.data),
  create: (input: CategoryInput) => api.post<Category>("/categories", input).then((r) => r.data),
  update: (id: number, input: CategoryInput) =>
    api.put<Category>(`/categories/${id}`, input).then((r) => r.data),
  archive: (id: number) => api.delete(`/categories/${id}`),
  restore: (id: number) => api.post<Category>(`/categories/${id}/restore`).then((r) => r.data),
};

export const transactionApi = {
  list: (from?: string, to?: string) =>
    api
      .get<Transaction[]>("/transactions", { params: { from, to } })
      .then((r) => r.data),
  create: (input: TransactionInput) =>
    api.post<Transaction>("/transactions", input).then((r) => r.data),
  update: (id: number, input: TransactionInput) =>
    api.put<Transaction>(`/transactions/${id}`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/transactions/${id}`),
};

export const reportApi = {
  summary: (from: string, to: string) =>
    api.get<Summary>("/reports/summary", { params: { from, to } }).then((r) => r.data),
};

export const budgetApi = {
  list: (period: BudgetPeriod, periodValue: string) =>
    api.get<Budget[]>("/budgets", { params: { period, periodValue } }).then((r) => r.data),
  create: (input: BudgetInput) => api.post<Budget>("/budgets", input).then((r) => r.data),
  update: (id: number, input: BudgetInput) =>
    api.put<Budget>(`/budgets/${id}`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/budgets/${id}`),
};

export const savingsApi = {
  list: () => api.get<SavingsAccount[]>("/savings").then((r) => r.data),
  create: (input: SavingsAccountInput) => api.post<SavingsAccount>("/savings", input).then((r) => r.data),
  update: (id: number, input: SavingsAccountInput) =>
    api.put<SavingsAccount>(`/savings/${id}`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/savings/${id}`),
  archive: (id: number) => api.post<SavingsAccount>(`/savings/${id}/archive`).then((r) => r.data),
  unarchive: (id: number) => api.post<SavingsAccount>(`/savings/${id}/unarchive`).then((r) => r.data),
  contribute: (id: number, input: ContributionInput) =>
    api.post<SavingsAccount>(`/savings/${id}/contributions`, input).then((r) => r.data),
  withdraw: (id: number, input: ContributionInput) =>
    api.post<SavingsAccount>(`/savings/${id}/withdrawals`, input).then((r) => r.data),
};

export const debtApi = {
  list: () => api.get<Debt[]>("/debts").then((r) => r.data),
  create: (input: DebtInput) => api.post<Debt>("/debts", input).then((r) => r.data),
  update: (id: number, input: DebtInput) =>
    api.put<Debt>(`/debts/${id}`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/debts/${id}`),
  recordPayment: (id: number, input: PaymentInput) =>
    api.post<Debt>(`/debts/${id}/payments`, input).then((r) => r.data),
  payoffPlan: (extraPayment: number) =>
    api
      .get<PayoffComparison>("/debts/payoff-plan", { params: { extraPayment } })
      .then((r) => r.data),
  customPlan: (extraPayment: number) =>
    api.get<StrategyResult>("/debts/payoff-plan/custom", { params: { extraPayment } }).then((r) => r.data),
  recommendation: () => api.get<DebtRecommendation[]>("/debts/recommendation").then((r) => r.data),
  smartPlan: () => api.get<SmartPlanResponse>("/debts/smart-plan").then((r) => r.data),
};

export const goalApi = {
  list: () => api.get<Goal[]>("/goals").then((r) => r.data),
  create: (input: GoalInput) => api.post<Goal>("/goals", input).then((r) => r.data),
  update: (id: number, input: GoalInput) =>
    api.put<Goal>(`/goals/${id}`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/goals/${id}`),
  progress: (id: number) => api.get<GoalProgress>(`/goals/${id}/progress`).then((r) => r.data),
};

export const dashboardApi = {
  summary: (month: string) => api.get<DashboardResponse>("/dashboard", { params: { month } }).then((r) => r.data),
  yearly: (year: number) =>
    api.get<YearlySummaryResponse>("/dashboard/yearly", { params: { year } }).then((r) => r.data),
};

export const settingsApi = {
  get: () => api.get<UserSettings>("/settings").then((r) => r.data),
  update: (input: UserSettings) => api.put<UserSettings>("/settings", input).then((r) => r.data),
};
