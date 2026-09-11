package com.vexsa.wealth.debt.dto;

import java.math.BigDecimal;

public record DebtRecommendation(
        int rank,
        Long debtId,
        String name,
        BigDecimal currentBalance,
        BigDecimal interestRate,
        boolean interestBearing,
        String reason
) {
}
