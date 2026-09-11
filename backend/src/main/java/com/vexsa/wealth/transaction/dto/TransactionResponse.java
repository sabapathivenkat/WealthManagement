package com.vexsa.wealth.transaction.dto;

import com.vexsa.wealth.common.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransactionResponse(
        Long id,
        Long categoryId,
        String categoryName,
        Long relatedSavingsAccountId,
        String relatedSavingsAccountName,
        Long relatedDebtId,
        String relatedDebtName,
        BigDecimal amount,
        TransactionType type,
        LocalDate txnDate,
        String note,
        boolean isRecurring
) {
}
