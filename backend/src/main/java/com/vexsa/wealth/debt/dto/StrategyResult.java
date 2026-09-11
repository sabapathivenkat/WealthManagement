package com.vexsa.wealth.debt.dto;

import com.vexsa.wealth.debt.PayoffStrategy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record StrategyResult(
        PayoffStrategy strategy,
        int totalMonths,
        BigDecimal totalInterestPaid,
        LocalDate payoffDate,
        List<DebtPayoffDetail> debts,
        List<MonthlyPoint> monthlySchedule
) {
}
