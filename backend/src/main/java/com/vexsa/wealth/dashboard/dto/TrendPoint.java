package com.vexsa.wealth.dashboard.dto;

import java.math.BigDecimal;

public record TrendPoint(
        String month,
        BigDecimal totalAssets,
        BigDecimal totalDebt,
        BigDecimal netWorth,
        BigDecimal income,
        BigDecimal expense,
        BigDecimal savingsContributions,
        BigDecimal debtPayments
) {
}
