package com.vexsa.wealth.budget;

import com.vexsa.wealth.budget.dto.BudgetRequest;
import com.vexsa.wealth.budget.dto.BudgetResponse;
import com.vexsa.wealth.category.CategoryRepository;
import com.vexsa.wealth.common.BadRequestException;
import com.vexsa.wealth.common.CurrentUser;
import com.vexsa.wealth.common.ResourceNotFoundException;
import com.vexsa.wealth.transaction.Transaction;
import com.vexsa.wealth.transaction.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final CurrentUser currentUser;

    public List<BudgetResponse> list(BudgetPeriod period, String periodValue) {
        Long userId = currentUser.id();
        List<Budget> budgets = budgetRepository.findByUserIdAndPeriodAndPeriodValue(userId, period, periodValue);
        Map<Long, String> categoryNames = categoryNameMap();
        LocalDate[] range = dateRange(period, periodValue);
        List<Transaction> transactions = transactionRepository
                .findByUserIdAndTxnDateBetweenOrderByTxnDateDesc(userId, range[0], range[1]);

        return budgets.stream().map(b -> {
            BigDecimal actual = transactions.stream()
                    .filter(t -> b.getCategoryId().equals(t.getCategoryId()))
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            return new BudgetResponse(b.getId(), b.getCategoryId(),
                    categoryNames.getOrDefault(b.getCategoryId(), "Unknown"),
                    b.getPeriod(), b.getPeriodValue(), b.getPlannedAmount(), actual);
        }).toList();
    }

    public BudgetResponse create(BudgetRequest request) {
        Long userId = currentUser.id();
        if (budgetRepository.existsByUserIdAndCategoryIdAndPeriodAndPeriodValue(
                userId, request.categoryId(), request.period(), request.periodValue())) {
            throw new BadRequestException("A budget for this category and period already exists");
        }
        validatePeriodValue(request.period(), request.periodValue());

        Budget budget = new Budget();
        budget.setUserId(userId);
        budget.setCategoryId(request.categoryId());
        budget.setPeriod(request.period());
        budget.setPeriodValue(request.periodValue());
        budget.setPlannedAmount(request.plannedAmount());
        budgetRepository.save(budget);

        return toResponseWithZeroActual(budget);
    }

    public BudgetResponse update(Long id, BudgetRequest request) {
        Budget budget = findOwned(id);
        validatePeriodValue(request.period(), request.periodValue());
        budget.setCategoryId(request.categoryId());
        budget.setPeriod(request.period());
        budget.setPeriodValue(request.periodValue());
        budget.setPlannedAmount(request.plannedAmount());
        budgetRepository.save(budget);
        return toResponseWithZeroActual(budget);
    }

    public void delete(Long id) {
        budgetRepository.delete(findOwned(id));
    }

    private void validatePeriodValue(BudgetPeriod period, String periodValue) {
        try {
            if (period == BudgetPeriod.MONTH) {
                YearMonth.parse(periodValue);
            } else {
                Year.parse(periodValue);
            }
        } catch (Exception e) {
            throw new BadRequestException("periodValue '" + periodValue + "' does not match period " + period);
        }
    }

    private Budget findOwned(Long id) {
        Budget budget = budgetRepository.findByIdAndUserId(id, currentUser.id());
        if (budget == null) {
            throw new ResourceNotFoundException("Budget not found");
        }
        return budget;
    }

    private LocalDate[] dateRange(BudgetPeriod period, String periodValue) {
        if (period == BudgetPeriod.MONTH) {
            YearMonth ym = YearMonth.parse(periodValue);
            return new LocalDate[]{ym.atDay(1), ym.atEndOfMonth()};
        }
        Year year = Year.parse(periodValue);
        return new LocalDate[]{year.atDay(1), year.atMonth(12).atEndOfMonth()};
    }

    private Map<Long, String> categoryNameMap() {
        return categoryRepository.findByUserIdIsNullOrUserId(currentUser.id()).stream()
                .collect(java.util.stream.Collectors.toMap(
                        com.vexsa.wealth.category.Category::getId,
                        com.vexsa.wealth.category.Category::getName));
    }

    private BudgetResponse toResponseWithZeroActual(Budget budget) {
        Map<Long, String> categoryNames = categoryNameMap();
        return new BudgetResponse(budget.getId(), budget.getCategoryId(),
                categoryNames.getOrDefault(budget.getCategoryId(), "Unknown"),
                budget.getPeriod(), budget.getPeriodValue(), budget.getPlannedAmount(), BigDecimal.ZERO);
    }
}
