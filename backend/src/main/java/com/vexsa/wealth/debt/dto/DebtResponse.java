package com.vexsa.wealth.debt.dto;

import com.vexsa.wealth.debt.DebtStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DebtResponse(
        Long id,
        String name,
        Long debtCategoryId,
        String debtCategoryName,
        BigDecimal originalAmount,
        BigDecimal currentBalance,
        BigDecimal interestRate,
        BigDecimal emiAmount,
        BigDecimal minPayment,
        Integer remainingMonths,
        LocalDate startDate,
        LocalDate expectedEndDate,
        Integer dueDay,
        boolean interestBearing,
        Integer priority,
        String notes,
        DebtStatus status
) {
}
