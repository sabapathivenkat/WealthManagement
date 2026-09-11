package com.vexsa.wealth.savings.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SavingsAccountResponse(
        Long id,
        String name,
        Long categoryId,
        String categoryName,
        BigDecimal initialValue,
        BigDecimal currentValue,
        LocalDate startDate,
        String notes,
        boolean active
) {
}
