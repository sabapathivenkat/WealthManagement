package com.vexsa.wealth.budget;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BudgetRepository extends JpaRepository<Budget, Long> {
    List<Budget> findByUserIdAndPeriodAndPeriodValue(Long userId, BudgetPeriod period, String periodValue);
    Budget findByIdAndUserId(Long id, Long userId);
    boolean existsByUserIdAndCategoryIdAndPeriodAndPeriodValue(Long userId, Long categoryId, BudgetPeriod period, String periodValue);
}
