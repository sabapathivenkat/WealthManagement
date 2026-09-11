package com.vexsa.wealth.savings.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SavingsAccountRequest(
        @NotBlank String name,
        @NotNull Long categoryId,
        @NotNull @DecimalMin(value = "0.0") BigDecimal initialValue,
        LocalDate startDate,
        String notes
) {
}
