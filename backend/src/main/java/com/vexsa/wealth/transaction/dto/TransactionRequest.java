package com.vexsa.wealth.transaction.dto;

import com.vexsa.wealth.common.TransactionType;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransactionRequest(
        Long categoryId,
        Long relatedSavingsAccountId,
        Long relatedDebtId,
        @NotNull BigDecimal amount,
        @NotNull TransactionType type,
        @NotNull LocalDate txnDate,
        String note,
        Boolean isRecurring,
        Boolean force
) {
    public boolean recurring() {
        return Boolean.TRUE.equals(isRecurring);
    }

    public boolean forced() {
        return Boolean.TRUE.equals(force);
    }
}
