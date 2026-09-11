package com.vexsa.wealth.debt.dto;

import com.vexsa.wealth.debt.PayoffStrategy;

import java.math.BigDecimal;
import java.util.List;

/**
 * The app's automatic debt-free plan: which ordering strategy to use and how much extra to
 * pay each month, decided from the user's own recent income/expenses rather than left for the
 * user to pick manually. {@code baseline} is the same strategy with no extra payment, so
 * monthsSaved/interestSaved measure exactly what the suggested extra payment buys.
 */
public record SmartPlanResponse(
        BigDecimal averageMonthlyIncome,
        BigDecimal averageMonthlyExpenses,
        BigDecimal monthlySurplus,
        BigDecimal suggestedExtraPayment,
        PayoffStrategy chosenStrategy,
        StrategyResult baseline,
        StrategyResult plan,
        int monthsSaved,
        BigDecimal interestSaved,
        String headline,
        List<DebtRecommendation> priority
) {
}
