package com.vexsa.wealth.debt;

import com.vexsa.wealth.debt.dto.DebtPayoffDetail;
import com.vexsa.wealth.debt.dto.MonthlyPoint;
import com.vexsa.wealth.debt.dto.StrategyResult;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Simulates a multi-debt payoff schedule month by month. Any minimum payment freed up
 * by an earlier payoff is rolled into the extra payment pool for subsequent months
 * (the "snowballing" effect), regardless of which ordering strategy is used.
 *
 * Starting balances are supplied by the caller (derived from the transaction ledger) rather
 * than read off the Debt entity, since Debt no longer stores a mutable current balance.
 */
public class DebtPayoffSimulator {

    public static final int MAX_MONTHS = 1200; // 100 years safety cap against non-amortizing inputs
    private static final MathContext MC = new MathContext(10);

    public static StrategyResult simulate(List<Debt> debts, Map<Long, BigDecimal> startingBalances,
                                           PayoffStrategy strategy, BigDecimal extraPayment) {
        List<Debt> ordered = new ArrayList<>(debts);
        Comparator<Debt> comparator = switch (strategy) {
            case AVALANCHE -> Comparator.comparing((Debt d) -> rate(d)).reversed();
            case SNOWBALL -> Comparator.comparing((Debt d) -> startingBalances.getOrDefault(d.getId(), BigDecimal.ZERO));
            case CUSTOM -> Comparator.comparing((Debt d) -> d.getPriority() == null ? Integer.MAX_VALUE : d.getPriority());
        };
        ordered.sort(comparator);

        Map<Long, BigDecimal> balances = new HashMap<>();
        Map<Long, BigDecimal> interestPaid = new HashMap<>();
        Map<Long, Integer> payoffMonth = new HashMap<>();
        for (Debt d : ordered) {
            BigDecimal starting = startingBalances.getOrDefault(d.getId(), BigDecimal.ZERO).max(BigDecimal.ZERO);
            balances.put(d.getId(), starting);
            interestPaid.put(d.getId(), BigDecimal.ZERO);
        }

        List<MonthlyPoint> schedule = new ArrayList<>();
        BigDecimal totalInterest = BigDecimal.ZERO;
        BigDecimal extraPool = extraPayment;
        int month = 0;

        while (hasRemainingBalance(balances) && month < MAX_MONTHS) {
            month++;
            BigDecimal availableExtra = extraPool;

            for (Debt d : ordered) {
                BigDecimal balance = balances.get(d.getId());
                if (balance.signum() <= 0) {
                    continue;
                }

                BigDecimal monthlyRate = rate(d).divide(BigDecimal.valueOf(1200), MC);
                BigDecimal interest = balance.multiply(monthlyRate, MC).setScale(2, RoundingMode.HALF_UP);

                BigDecimal payment = minPayment(d);
                if (availableExtra.signum() > 0) {
                    payment = payment.add(availableExtra);
                    availableExtra = BigDecimal.ZERO;
                }

                BigDecimal maxPayment = balance.add(interest);
                if (payment.compareTo(maxPayment) > 0) {
                    payment = maxPayment;
                }

                BigDecimal principalPortion = payment.subtract(interest);
                BigDecimal newBalance = balance.subtract(principalPortion).max(BigDecimal.ZERO);

                balances.put(d.getId(), newBalance);
                interestPaid.merge(d.getId(), interest, BigDecimal::add);
                totalInterest = totalInterest.add(interest);

                if (newBalance.signum() == 0 && !payoffMonth.containsKey(d.getId())) {
                    payoffMonth.put(d.getId(), month);
                    extraPool = extraPool.add(minPayment(d));
                }
            }

            BigDecimal totalRemaining = balances.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
            schedule.add(new MonthlyPoint(month, totalRemaining));
        }

        int finalMonth = month;
        List<DebtPayoffDetail> details = ordered.stream()
                .map(d -> new DebtPayoffDetail(
                        d.getId(),
                        d.getName(),
                        payoffMonth.getOrDefault(d.getId(), finalMonth),
                        interestPaid.get(d.getId()).setScale(2, RoundingMode.HALF_UP)))
                .toList();

        return new StrategyResult(
                strategy,
                month,
                totalInterest.setScale(2, RoundingMode.HALF_UP),
                LocalDate.now().plusMonths(month),
                details,
                schedule
        );
    }

    private static BigDecimal rate(Debt d) {
        return d.isInterestBearing() && d.getInterestRate() != null ? d.getInterestRate() : BigDecimal.ZERO;
    }

    private static BigDecimal minPayment(Debt d) {
        if (d.getMinPayment() != null) {
            return d.getMinPayment();
        }
        if (d.getEmiAmount() != null) {
            return d.getEmiAmount();
        }
        return BigDecimal.ZERO;
    }

    private static boolean hasRemainingBalance(Map<Long, BigDecimal> balances) {
        return balances.values().stream().anyMatch(b -> b.signum() > 0);
    }
}
