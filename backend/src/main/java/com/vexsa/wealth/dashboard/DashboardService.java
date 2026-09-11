package com.vexsa.wealth.dashboard;

import com.vexsa.wealth.category.Category;
import com.vexsa.wealth.category.CategoryRepository;
import com.vexsa.wealth.common.CurrentUser;
import com.vexsa.wealth.common.TransactionType;
import com.vexsa.wealth.dashboard.dto.AllocationSlice;
import com.vexsa.wealth.dashboard.dto.DashboardResponse;
import com.vexsa.wealth.dashboard.dto.TrendPoint;
import com.vexsa.wealth.dashboard.dto.YearlySummaryResponse;
import com.vexsa.wealth.debt.Debt;
import com.vexsa.wealth.debt.DebtRepository;
import com.vexsa.wealth.debt.DebtService;
import com.vexsa.wealth.debt.DebtStatus;
import com.vexsa.wealth.ledger.LedgerService;
import com.vexsa.wealth.savings.SavingsAccount;
import com.vexsa.wealth.savings.SavingsAccountRepository;
import com.vexsa.wealth.transaction.dto.CategoryBreakdown;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Year;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final SavingsAccountRepository savingsAccountRepository;
    private final DebtRepository debtRepository;
    private final CategoryRepository categoryRepository;
    private final LedgerService ledgerService;
    private final DebtService debtService;
    private final CurrentUser currentUser;

    public DashboardResponse summary(YearMonth month) {
        Long userId = currentUser.id();
        List<SavingsAccount> accounts = savingsAccountRepository.findByUserId(userId);
        List<Debt> debts = debtRepository.findByUserId(userId);

        LocalDate monthEnd = month.atEndOfMonth();
        LocalDate monthStart = month.atDay(1);

        BigDecimal totalAssets = totalAssetsAsOf(accounts, monthEnd);
        BigDecimal totalDebt = totalDebtAsOf(debts, monthEnd);
        BigDecimal netWorth = totalAssets.subtract(totalDebt);

        BigDecimal income = ledgerService.sumForUser(userId, TransactionType.INCOME, monthStart, monthEnd);
        BigDecimal expense = ledgerService.sumForUser(userId, TransactionType.EXPENSE, monthStart, monthEnd);
        BigDecimal monthlySavings = income.subtract(expense);
        BigDecimal savingsContributions = ledgerService.sumForUser(userId, TransactionType.SAVINGS_CONTRIBUTION, monthStart, monthEnd);
        BigDecimal debtPayments = ledgerService.sumForUser(userId, TransactionType.DEBT_PAYMENT, monthStart, monthEnd);

        BigDecimal savingsRate = percent(monthlySavings, income);
        BigDecimal expenseRatio = percent(expense, income);
        BigDecimal debtToIncome = percent(debtPayments, income);

        LocalDate debtFreeDate = null;
        if (debts.stream().anyMatch(d -> d.getStatus() == DebtStatus.ACTIVE)) {
            debtFreeDate = debtService.payoffPlan(BigDecimal.ZERO).avalanche().payoffDate();
        }

        BigDecimal emergencyFund = accounts.stream()
                .filter(SavingsAccount::isActive)
                .filter(a -> "Emergency Fund".equalsIgnoreCase(categoryName(a.getCategoryId())))
                .map(a -> ledgerService.derivedSavingsBalance(a.getInitialValue(), a.getId(), null))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal avgEssentialExpense = averageMonthlyExpense(userId, month, 3);
        BigDecimal emergencyCoverage = avgEssentialExpense.signum() == 0
                ? BigDecimal.ZERO
                : emergencyFund.divide(avgEssentialExpense, 1, RoundingMode.HALF_UP);

        List<TrendPoint> trend = trendSeries(userId, accounts, debts, month, 12);

        List<CategoryBreakdown> expenseByCategory = expenseBreakdown(userId, monthStart, monthEnd);
        List<AllocationSlice> allocation = savingsAllocation(accounts);

        return new DashboardResponse(
                month.toString(), totalAssets, totalDebt, netWorth,
                income, expense, monthlySavings, savingsRate,
                savingsContributions, debtPayments, totalDebt, debtFreeDate,
                expenseRatio, debtToIncome, emergencyCoverage,
                trend, expenseByCategory, allocation
        );
    }

    /** {@code year} is the Indian Financial Year start year: FY 2026-27 runs April 2026 - March 2027, so year=2026. */
    public YearlySummaryResponse yearly(Year year) {
        Long userId = currentUser.id();
        List<SavingsAccount> accounts = savingsAccountRepository.findByUserId(userId);
        List<Debt> debts = debtRepository.findByUserId(userId);

        YearMonth start = YearMonth.of(year.getValue(), 4);
        YearMonth end = YearMonth.of(year.getValue() + 1, 3);

        List<TrendPoint> months = new ArrayList<>();
        YearMonth cursor = start;
        while (!cursor.isAfter(end)) {
            months.add(monthPoint(userId, accounts, debts, cursor));
            cursor = cursor.plusMonths(1);
        }

        LocalDate beforeYear = start.minusMonths(1).atEndOfMonth();
        BigDecimal beginningAssets = totalAssetsAsOf(accounts, beforeYear);
        BigDecimal beginningDebt = totalDebtAsOf(debts, beforeYear);
        BigDecimal endingAssets = totalAssetsAsOf(accounts, end.atEndOfMonth());
        BigDecimal endingDebt = totalDebtAsOf(debts, end.atEndOfMonth());

        BigDecimal totalIncome = months.stream().map(TrendPoint::income).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalExpenses = months.stream().map(TrendPoint::expense).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalContributions = months.stream().map(TrendPoint::savingsContributions).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalDebtRepaid = months.stream().map(TrendPoint::debtPayments).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netWorthGrowth = (endingAssets.subtract(endingDebt)).subtract(beginningAssets.subtract(beginningDebt));
        BigDecimal savingsRate = percent(totalIncome.subtract(totalExpenses), totalIncome);
        BigDecimal debtReduction = beginningDebt.signum() == 0
                ? BigDecimal.ZERO
                : totalDebtRepaid.divide(beginningDebt, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(1, RoundingMode.HALF_UP);

        return new YearlySummaryResponse(year.getValue(), totalIncome, totalExpenses, totalContributions, totalDebtRepaid,
                beginningAssets, endingAssets, beginningDebt, endingDebt, netWorthGrowth, savingsRate, debtReduction, months);
    }

    private List<TrendPoint> trendSeries(Long userId, List<SavingsAccount> accounts, List<Debt> debts, YearMonth month, int months) {
        List<TrendPoint> result = new ArrayList<>();
        YearMonth cursor = month.minusMonths(months - 1L);
        for (int i = 0; i < months; i++) {
            result.add(monthPoint(userId, accounts, debts, cursor));
            cursor = cursor.plusMonths(1);
        }
        return result;
    }

    private TrendPoint monthPoint(Long userId, List<SavingsAccount> accounts, List<Debt> debts, YearMonth ym) {
        LocalDate monthStart = ym.atDay(1);
        LocalDate monthEnd = ym.atEndOfMonth();
        BigDecimal assets = totalAssetsAsOf(accounts, monthEnd);
        BigDecimal debt = totalDebtAsOf(debts, monthEnd);
        BigDecimal income = ledgerService.sumForUser(userId, TransactionType.INCOME, monthStart, monthEnd);
        BigDecimal expense = ledgerService.sumForUser(userId, TransactionType.EXPENSE, monthStart, monthEnd);
        BigDecimal contributions = ledgerService.sumForUser(userId, TransactionType.SAVINGS_CONTRIBUTION, monthStart, monthEnd);
        BigDecimal payments = ledgerService.sumForUser(userId, TransactionType.DEBT_PAYMENT, monthStart, monthEnd);
        return new TrendPoint(ym.toString(), assets, debt, assets.subtract(debt), income, expense, contributions, payments);
    }

    private BigDecimal totalAssetsAsOf(List<SavingsAccount> accounts, LocalDate asOf) {
        return accounts.stream()
                .filter(SavingsAccount::isActive)
                .filter(a -> a.getStartDate() == null || !a.getStartDate().isAfter(asOf))
                .map(a -> ledgerService.derivedSavingsBalance(a.getInitialValue(), a.getId(), asOf))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal totalDebtAsOf(List<Debt> debts, LocalDate asOf) {
        return debts.stream()
                .filter(d -> !d.getStartDate().isAfter(asOf))
                .map(d -> ledgerService.derivedDebtBalance(d.getOriginalAmount(), d.getId(), asOf))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal averageMonthlyExpense(Long userId, YearMonth month, int lookbackMonths) {
        BigDecimal total = BigDecimal.ZERO;
        for (int i = 0; i < lookbackMonths; i++) {
            YearMonth ym = month.minusMonths(i);
            total = total.add(ledgerService.sumForUser(userId, TransactionType.EXPENSE, ym.atDay(1), ym.atEndOfMonth()));
        }
        return total.divide(BigDecimal.valueOf(lookbackMonths), 2, RoundingMode.HALF_UP);
    }

    private List<CategoryBreakdown> expenseBreakdown(Long userId, LocalDate from, LocalDate to) {
        Map<Long, BigDecimal> byCategory = new LinkedHashMap<>();
        ledgerService.transactionsUpTo(userId, to).stream()
                .filter(t -> t.getType() == TransactionType.EXPENSE && !t.getTxnDate().isBefore(from))
                .forEach(t -> byCategory.merge(t.getCategoryId(), t.getAmount(), BigDecimal::add));

        return byCategory.entrySet().stream()
                .map(e -> new CategoryBreakdown(e.getKey(), categoryName(e.getKey()), e.getValue()))
                .sorted(Comparator.comparing(CategoryBreakdown::amount).reversed())
                .toList();
    }

    private List<AllocationSlice> savingsAllocation(List<SavingsAccount> accounts) {
        Map<String, BigDecimal> byCategory = new LinkedHashMap<>();
        for (SavingsAccount a : accounts) {
            if (!a.isActive()) continue;
            BigDecimal value = ledgerService.derivedSavingsBalance(a.getInitialValue(), a.getId(), null);
            byCategory.merge(categoryName(a.getCategoryId()), value, BigDecimal::add);
        }
        return byCategory.entrySet().stream()
                .map(e -> new AllocationSlice(e.getKey(), e.getValue()))
                .sorted(Comparator.comparing(AllocationSlice::amount).reversed())
                .toList();
    }

    private String categoryName(Long id) {
        Category category = categoryRepository.findById(id).orElse(null);
        return category == null ? "Unknown" : category.getName();
    }

    private BigDecimal percent(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return numerator.divide(denominator, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(1, RoundingMode.HALF_UP);
    }
}
