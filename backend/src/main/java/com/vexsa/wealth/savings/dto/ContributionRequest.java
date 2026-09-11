package com.vexsa.wealth.savings.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ContributionRequest(
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotNull LocalDate txnDate,
        String note,
        Boolean force
) {
    public boolean forced() {
        return Boolean.TRUE.equals(force);
    }
}
