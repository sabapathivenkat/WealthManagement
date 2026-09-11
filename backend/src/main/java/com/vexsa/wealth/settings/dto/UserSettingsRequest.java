package com.vexsa.wealth.settings.dto;

import com.vexsa.wealth.debt.PayoffStrategy;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UserSettingsRequest(
        @NotBlank String currency,
        @Min(1) @Max(12) int fyStartMonth,
        @NotNull PayoffStrategy defaultDebtStrategy
) {
}
