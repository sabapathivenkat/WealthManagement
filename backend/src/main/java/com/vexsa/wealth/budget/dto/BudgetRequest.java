package com.vexsa.wealth.budget.dto;

import com.vexsa.wealth.budget.BudgetPeriod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

public record BudgetRequest(
        @NotNull Long categoryId,
        @NotNull BudgetPeriod period,
        @NotNull @Pattern(regexp = "\\d{4}(-\\d{2})?", message = "periodValue must be YYYY or YYYY-MM")
        String periodValue,
        @NotNull @DecimalMin(value = "0.0") BigDecimal plannedAmount
) {
}
