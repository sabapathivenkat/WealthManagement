package com.vexsa.wealth.transaction.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record SummaryResponse(
        LocalDate from,
        LocalDate to,
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal net,
        List<CategoryBreakdown> byCategory
) {
}
