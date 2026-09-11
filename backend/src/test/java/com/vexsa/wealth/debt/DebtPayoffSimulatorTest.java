package com.vexsa.wealth.debt;

import com.vexsa.wealth.debt.dto.StrategyResult;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DebtPayoffSimulatorTest {

    private Debt debt(long id, String name, String balance, String rate, String minPayment) {
        Debt d = new Debt();
        d.setId(id);
        d.setName(name);
        d.setOriginalAmount(new BigDecimal(balance));
        d.setInterestRate(new BigDecimal(rate));
        d.setInterestBearing(true);
        d.setMinPayment(new BigDecimal(minPayment));
        d.setStartDate(LocalDate.now());
        return d;
    }

    private Map<Long, BigDecimal> balances(Debt... debts) {
        Map<Long, BigDecimal> map = new java.util.HashMap<>();
        for (Debt d : debts) {
            map.put(d.getId(), d.getOriginalAmount());
        }
        return map;
    }

    @Test
    void singleDebtPayoffWithNoExtraPayment() {
        // 1200 balance, 0% interest, 100/month min payment -> exactly 12 months, zero interest
        Debt d = debt(1L, "Card", "1200", "0", "100");
        List<Debt> debts = List.of(d);
        StrategyResult result = DebtPayoffSimulator.simulate(debts, balances(d), PayoffStrategy.AVALANCHE, BigDecimal.ZERO);

        assertEquals(12, result.totalMonths());
        assertEquals(0, result.totalInterestPaid().compareTo(BigDecimal.ZERO));
        assertEquals(12, result.debts().get(0).payoffMonth());
    }

    @Test
    void avalancheOrdersHigherInterestRateFirst() {
        Debt lowRate = debt(1L, "LowRate", "1000", "5", "50");
        Debt highRate = debt(2L, "HighRate", "1000", "20", "50");
        List<Debt> debts = List.of(lowRate, highRate);
        StrategyResult result = DebtPayoffSimulator.simulate(debts, balances(lowRate, highRate), PayoffStrategy.AVALANCHE, new BigDecimal("200"));

        // HighRate should receive the extra payment first and pay off sooner
        int highRateMonth = result.debts().stream().filter(d -> d.name().equals("HighRate")).findFirst().get().payoffMonth();
        int lowRateMonth = result.debts().stream().filter(d -> d.name().equals("LowRate")).findFirst().get().payoffMonth();
        assertTrue(highRateMonth <= lowRateMonth);
    }

    @Test
    void snowballOrdersSmallestBalanceFirst() {
        Debt big = debt(1L, "BigBalance", "5000", "10", "50");
        Debt small = debt(2L, "SmallBalance", "500", "10", "50");
        List<Debt> debts = List.of(big, small);
        StrategyResult result = DebtPayoffSimulator.simulate(debts, balances(big, small), PayoffStrategy.SNOWBALL, new BigDecimal("200"));

        int smallMonth = result.debts().stream().filter(d -> d.name().equals("SmallBalance")).findFirst().get().payoffMonth();
        int bigMonth = result.debts().stream().filter(d -> d.name().equals("BigBalance")).findFirst().get().payoffMonth();
        assertTrue(smallMonth <= bigMonth);
    }

    @Test
    void freedMinPaymentRollsIntoRemainingDebts() {
        // SmallBalance pays off quickly with the extra payment, then its min payment should
        // accelerate BigBalance's payoff relative to receiving no extra payment at all.
        Debt small1 = debt(1L, "SmallBalance", "200", "0", "50");
        Debt big1 = debt(2L, "BigBalance", "3000", "0", "50");
        List<Debt> debtsWithExtra = List.of(small1, big1);
        StrategyResult withExtra = DebtPayoffSimulator.simulate(debtsWithExtra, balances(small1, big1), PayoffStrategy.SNOWBALL, new BigDecimal("100"));

        Debt small2 = debt(1L, "SmallBalance", "200", "0", "50");
        Debt big2 = debt(2L, "BigBalance", "3000", "0", "50");
        List<Debt> debtsNoExtra = List.of(small2, big2);
        StrategyResult noExtra = DebtPayoffSimulator.simulate(debtsNoExtra, balances(small2, big2), PayoffStrategy.SNOWBALL, BigDecimal.ZERO);

        assertTrue(withExtra.totalMonths() < noExtra.totalMonths());
    }

    @Test
    void customStrategyOrdersByPriority() {
        Debt first = debt(1L, "First", "1000", "5", "50");
        first.setPriority(1);
        Debt second = debt(2L, "Second", "1000", "20", "50");
        second.setPriority(2);
        List<Debt> debts = List.of(second, first);
        StrategyResult result = DebtPayoffSimulator.simulate(debts, balances(first, second), PayoffStrategy.CUSTOM, new BigDecimal("200"));

        int firstMonth = result.debts().stream().filter(d -> d.name().equals("First")).findFirst().get().payoffMonth();
        int secondMonth = result.debts().stream().filter(d -> d.name().equals("Second")).findFirst().get().payoffMonth();
        assertTrue(firstMonth <= secondMonth);
    }
}
