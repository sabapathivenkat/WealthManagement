package com.vexsa.wealth.goal.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record GoalResponse(
        Long id,
        String name,
        BigDecimal targetAmount,
        LocalDate targetDate,
        BigDecimal currentAmount
) {
}
