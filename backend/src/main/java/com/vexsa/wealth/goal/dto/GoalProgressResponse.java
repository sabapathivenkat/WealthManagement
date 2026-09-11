package com.vexsa.wealth.goal.dto;

import java.math.BigDecimal;

public record GoalProgressResponse(
        BigDecimal remainingAmount,
        long monthsRemaining,
        BigDecimal requiredMonthlySaving,
        BigDecimal percentComplete
) {
}
