package com.vexsa.wealth.dashboard.dto;

import com.vexsa.wealth.transaction.dto.CategoryBreakdown;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DashboardResponse(
        String month,
        BigDecimal totalAssets,
        BigDecimal totalDebt,
        BigDecimal netWorth,
        BigDecimal monthlyIncome,
        BigDecimal monthlyExpenses,
        BigDecimal monthlySavings,
        BigDecimal savingsRate,
        BigDecimal savingsContributionsThisMonth,
        BigDecimal debtPaidThisMonth,
        BigDecimal remainingDebt,
        LocalDate estimatedDebtFreeDate,
        BigDecimal expenseRatio,
        BigDecimal debtToIncomeRatio,
        BigDecimal emergencyFundCoverageMonths,
        List<TrendPoint> trend,
        List<CategoryBreakdown> expenseByCategory,
        List<AllocationSlice> savingsAllocation
) {
}
