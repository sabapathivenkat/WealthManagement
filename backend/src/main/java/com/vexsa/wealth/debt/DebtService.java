package com.vexsa.wealth.debt;

import com.vexsa.wealth.category.CategoryRepository;
import com.vexsa.wealth.common.CurrentUser;
import com.vexsa.wealth.common.ResourceNotFoundException;
import com.vexsa.wealth.common.TransactionType;
import com.vexsa.wealth.debt.dto.*;
import com.vexsa.wealth.ledger.LedgerService;
import com.vexsa.wealth.transaction.TransactionService;
import com.vexsa.wealth.transaction.dto.TransactionRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DebtService {

    private final DebtRepository debtRepository;
    private final CategoryRepository categoryRepository;
    private final LedgerService ledgerService;
    private final TransactionService transactionService;
    private final CurrentUser currentUser;

    public List<DebtResponse> list() {
        Map<Long, String> categoryNames = categoryNameMap();
        return debtRepository.findByUserId(currentUser.id()).stream()
                .map(d -> toResponse(d, categoryNames))
                .toList();
    }

    public DebtResponse create(DebtRequest request) {
        Debt debt = new Debt();
        debt.setUserId(currentUser.id());
        applyRequest(debt, request);
        debtRepository.save(debt);
        return toResponse(debt, categoryNameMap());
    }

    public DebtResponse update(Long id, DebtRequest request) {
        Debt debt = findOwned(id);
        applyRequest(debt, request);
        debtRepository.save(debt);
        return toResponse(debt, categoryNameMap());
    }

    public void delete(Long id) {
        debtRepository.delete(findOwned(id));
    }

    public DebtResponse recordPayment(Long id, BigDecimal amount, LocalDate txnDate, String note, boolean force) {
        Debt debt = findOwned(id);
        TransactionRequest request = new TransactionRequest(
                null, null, debt.getId(), amount, TransactionType.DEBT_PAYMENT, txnDate, note, false, force);
        transactionService.create(request);

        BigDecimal newBalance = ledgerService.derivedDebtBalance(debt.getOriginalAmount(), debt.getId(), null);
        if (newBalance.signum() <= 0 && debt.getStatus() == DebtStatus.ACTIVE) {
            debt.setStatus(DebtStatus.CLOSED);
            debtRepository.save(debt);
        }
        return toResponse(debt, categoryNameMap());
    }

    public PayoffComparisonResponse payoffPlan(BigDecimal extraPayment) {
        List<Debt> debts = debtRepository.findByUserId(currentUser.id()).stream()
                .filter(d -> d.getStatus() == DebtStatus.ACTIVE)
                .toList();
        Map<Long, BigDecimal> balances = currentBalances(debts);
        BigDecimal extra = extraPayment == null ? BigDecimal.ZERO : extraPayment;
        var avalanche = DebtPayoffSimulator.simulate(debts, balances, PayoffStrategy.AVALANCHE, extra);
        var snowball = DebtPayoffSimulator.simulate(debts, balances, PayoffStrategy.SNOWBALL, extra);
        return new PayoffComparisonResponse(avalanche, snowball);
    }

    public StrategyResult customPlan(BigDecimal extraPayment) {
        List<Debt> debts = debtRepository.findByUserId(currentUser.id()).stream()
                .filter(d -> d.getStatus() == DebtStatus.ACTIVE)
                .toList();
        Map<Long, BigDecimal> balances = currentBalances(debts);
        BigDecimal extra = extraPayment == null ? BigDecimal.ZERO : extraPayment;
        return DebtPayoffSimulator.simulate(debts, balances, PayoffStrategy.CUSTOM, extra);
    }

    public List<DebtRecommendation> recommendation() {
        List<Debt> debts = debtRepository.findByUserId(currentUser.id()).stream()
                .filter(d -> d.getStatus() == DebtStatus.ACTIVE)
                .toList();
        Map<Long, BigDecimal> balances = currentBalances(debts);

        List<Debt> ordered = debts.stream()
                .sorted((a, b) -> {
                    if (a.getPriority() != null || b.getPriority() != null) {
                        int pa = a.getPriority() == null ? Integer.MAX_VALUE : a.getPriority();
                        int pb = b.getPriority() == null ? Integer.MAX_VALUE : b.getPriority();
                        if (pa != pb) return Integer.compare(pa, pb);
                    }
                    boolean aInterestFree = !a.isInterestBearing() || a.getInterestRate() == null || a.getInterestRate().signum() == 0;
                    boolean bInterestFree = !b.isInterestBearing() || b.getInterestRate() == null || b.getInterestRate().signum() == 0;
                    if (aInterestFree != bInterestFree) return aInterestFree ? 1 : -1;
                    BigDecimal ra = a.getInterestRate() == null ? BigDecimal.ZERO : a.getInterestRate();
                    BigDecimal rb = b.getInterestRate() == null ? BigDecimal.ZERO : b.getInterestRate();
                    return rb.compareTo(ra);
                })
                .toList();

        List<DebtRecommendation> result = new java.util.ArrayList<>();
        int rank = 1;
        for (Debt d : ordered) {
            result.add(new DebtRecommendation(rank++, d.getId(), d.getName(), balances.getOrDefault(d.getId(), BigDecimal.ZERO),
                    d.getInterestRate(), d.isInterestBearing(), reason(d)));
        }
        return result;
    }

    /**
     * Decides the whole debt-free plan automatically from the user's own cash flow — no manual
     * strategy pick or extra-payment guess required. Computes how much extra can safely go
     * toward debt each month from the last 3 months of actual income/expenses, then simulates
     * both ordering strategies (avalanche/snowball) with that amount and keeps whichever costs
     * less interest. {@code baseline} re-runs the chosen strategy with zero extra payment, so
     * monthsSaved/interestSaved isolate exactly what the suggested extra payment is buying.
     */
    public SmartPlanResponse smartPlan() {
        Long userId = currentUser.id();
        List<Debt> debts = debtRepository.findByUserId(userId).stream()
                .filter(d -> d.getStatus() == DebtStatus.ACTIVE)
                .toList();
        Map<Long, BigDecimal> balances = currentBalances(debts);

        BigDecimal avgIncome = averageMonthly(userId, TransactionType.INCOME, 3);
        BigDecimal avgExpenses = averageMonthly(userId, TransactionType.EXPENSE, 3);
        BigDecimal surplus = avgIncome.subtract(avgExpenses).max(BigDecimal.ZERO);
        // Suggest committing 60% of the surplus to debt, keeping the rest as a cash buffer.
        BigDecimal suggestedExtra = surplus.multiply(new BigDecimal("0.6")).setScale(0, RoundingMode.DOWN);

        var avalancheWithExtra = DebtPayoffSimulator.simulate(debts, balances, PayoffStrategy.AVALANCHE, suggestedExtra);
        var snowballWithExtra = DebtPayoffSimulator.simulate(debts, balances, PayoffStrategy.SNOWBALL, suggestedExtra);
        boolean avalancheBetter = avalancheWithExtra.totalInterestPaid().compareTo(snowballWithExtra.totalInterestPaid()) <= 0;
        PayoffStrategy chosenStrategy = avalancheBetter ? PayoffStrategy.AVALANCHE : PayoffStrategy.SNOWBALL;
        var plan = avalancheBetter ? avalancheWithExtra : snowballWithExtra;
        var baseline = DebtPayoffSimulator.simulate(debts, balances, chosenStrategy, BigDecimal.ZERO);

        // If nothing is ever paid without the extra amount (no min payment/EMI on some debt), the
        // baseline never converges (hits the simulator's safety cap) and isn't a meaningful comparison.
        boolean baselineMeaningful = baseline.totalMonths() < DebtPayoffSimulator.MAX_MONTHS;
        int monthsSaved = baselineMeaningful ? baseline.totalMonths() - plan.totalMonths() : 0;
        BigDecimal interestSaved = baselineMeaningful
                ? baseline.totalInterestPaid().subtract(plan.totalInterestPaid()).max(BigDecimal.ZERO)
                : BigDecimal.ZERO;

        String strategyLabel = chosenStrategy == PayoffStrategy.AVALANCHE
                ? "paying off your highest-interest debt first"
                : "clearing your smallest balance first for quick wins";

        String headline;
        if (debts.isEmpty()) {
            headline = "You have no active debt to settle — nothing to plan for.";
        } else if (suggestedExtra.signum() <= 0) {
            headline = "Your expenses are currently at or above your income, so there's no safe surplus to put toward debt yet. We'll keep " + strategyLabel
                    + " with your minimum payments until that changes.";
        } else if (!baselineMeaningful) {
            headline = "Based on your last 3 months, you have about ₹" + surplus + "/month spare. One or more of your debts has no minimum payment or EMI set, so it would never be paid off on its own — we're automatically "
                    + strategyLabel + " and putting ₹" + suggestedExtra + "/month extra toward it, which gets you debt-free by " + plan.payoffDate() + ".";
        } else if (monthsSaved <= 0) {
            headline = "Based on your recent income and expenses, an extra ₹" + suggestedExtra + "/month is affordable, but your debts are already close to paid off.";
        } else {
            headline = "Based on your last 3 months, you have about ₹" + surplus + "/month spare. We're automatically " + strategyLabel
                    + " with that extra ₹" + suggestedExtra + "/month — this clears you " + monthsSaved
                    + " month(s) sooner, saves ₹" + interestSaved + " in interest, and gets you debt-free by " + plan.payoffDate() + ".";
        }

        return new SmartPlanResponse(
                avgIncome, avgExpenses, surplus, suggestedExtra,
                chosenStrategy, baseline, plan,
                monthsSaved, interestSaved, headline,
                recommendation()
        );
    }

    private BigDecimal averageMonthly(Long userId, TransactionType type, int lookbackMonths) {
        YearMonth month = YearMonth.now();
        BigDecimal total = BigDecimal.ZERO;
        for (int i = 0; i < lookbackMonths; i++) {
            YearMonth ym = month.minusMonths(i);
            total = total.add(ledgerService.sumForUser(userId, type, ym.atDay(1), ym.atEndOfMonth()));
        }
        return total.divide(BigDecimal.valueOf(lookbackMonths), 2, RoundingMode.HALF_UP);
    }

    private String reason(Debt d) {
        if (d.getPriority() != null) {
            return "User-defined priority " + d.getPriority();
        }
        if (!d.isInterestBearing() || d.getInterestRate() == null || d.getInterestRate().signum() == 0) {
            return "Interest-free — lowest urgency unless a priority is set";
        }
        return "Interest rate " + d.getInterestRate() + "% — highest-cost debt is prioritized first";
    }

    private Map<Long, BigDecimal> currentBalances(List<Debt> debts) {
        java.util.Map<Long, BigDecimal> map = new java.util.HashMap<>();
        for (Debt d : debts) {
            map.put(d.getId(), ledgerService.derivedDebtBalance(d.getOriginalAmount(), d.getId(), null));
        }
        return map;
    }

    private void applyRequest(Debt debt, DebtRequest request) {
        debt.setName(request.name());
        debt.setDebtCategoryId(request.debtCategoryId());
        debt.setOriginalAmount(request.originalAmount());
        debt.setInterestRate(request.interestRate());
        debt.setEmiAmount(request.emiAmount());
        debt.setMinPayment(request.minPayment());
        debt.setRemainingMonths(request.remainingMonths());
        debt.setStartDate(request.startDate());
        debt.setExpectedEndDate(request.expectedEndDate());
        debt.setDueDay(request.dueDay());
        debt.setInterestBearing(request.interestBearingOrDefault());
        debt.setPriority(request.priority());
        debt.setNotes(request.notes());
    }

    private Debt findOwned(Long id) {
        Debt debt = debtRepository.findByIdAndUserId(id, currentUser.id());
        if (debt == null) {
            throw new ResourceNotFoundException("Debt not found");
        }
        return debt;
    }

    private Map<Long, String> categoryNameMap() {
        return categoryRepository.findByUserIdIsNullOrUserId(currentUser.id()).stream()
                .collect(java.util.stream.Collectors.toMap(
                        com.vexsa.wealth.category.Category::getId,
                        com.vexsa.wealth.category.Category::getName));
    }

    private DebtResponse toResponse(Debt d, Map<Long, String> categoryNames) {
        BigDecimal currentBalance = ledgerService.derivedDebtBalance(d.getOriginalAmount(), d.getId(), null);
        return new DebtResponse(d.getId(), d.getName(), d.getDebtCategoryId(),
                categoryNames.getOrDefault(d.getDebtCategoryId(), "Unknown"),
                d.getOriginalAmount(), currentBalance, d.getInterestRate(), d.getEmiAmount(), d.getMinPayment(),
                d.getRemainingMonths(), d.getStartDate(), d.getExpectedEndDate(), d.getDueDay(),
                d.isInterestBearing(), d.getPriority(), d.getNotes(), d.getStatus());
    }
}
