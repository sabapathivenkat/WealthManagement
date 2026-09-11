package com.vexsa.wealth.dashboard.dto;

import java.math.BigDecimal;
import java.util.List;

public record YearlySummaryResponse(
        int year,
        BigDecimal totalIncome,
        BigDecimal totalExpenses,
        BigDecimal totalSavingsContributions,
        BigDecimal totalDebtRepaid,
        BigDecimal beginningAssets,
        BigDecimal endingAssets,
        BigDecimal beginningDebt,
        BigDecimal endingDebt,
        BigDecimal netWorthGrowth,
        BigDecimal savingsRate,
        BigDecimal debtReductionPercent,
        List<TrendPoint> months
) {
}
