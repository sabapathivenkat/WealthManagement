package com.vexsa.wealth.debt.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DebtRequest(
        @NotBlank String name,
        @NotNull Long debtCategoryId,
        @NotNull @DecimalMin(value = "0.01") BigDecimal originalAmount,
        @DecimalMin(value = "0.0") BigDecimal interestRate,
        @DecimalMin(value = "0.0") BigDecimal emiAmount,
        @DecimalMin(value = "0.0") BigDecimal minPayment,
        @Min(0) Integer remainingMonths,
        @NotNull LocalDate startDate,
        LocalDate expectedEndDate,
        @Min(1) Integer dueDay,
        Boolean interestBearing,
        Integer priority,
        String notes
) {
    public boolean interestBearingOrDefault() {
        return interestBearing == null || interestBearing;
    }
}
