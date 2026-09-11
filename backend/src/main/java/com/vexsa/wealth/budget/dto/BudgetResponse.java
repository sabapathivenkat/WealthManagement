package com.vexsa.wealth.budget.dto;

import com.vexsa.wealth.budget.BudgetPeriod;

import java.math.BigDecimal;

public record BudgetResponse(
        Long id,
        Long categoryId,
        String categoryName,
        BudgetPeriod period,
        String periodValue,
        BigDecimal plannedAmount,
        BigDecimal actualAmount
) {
}
