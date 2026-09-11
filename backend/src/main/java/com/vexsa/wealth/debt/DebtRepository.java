package com.vexsa.wealth.debt;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DebtRepository extends JpaRepository<Debt, Long> {
    List<Debt> findByUserId(Long userId);
    Debt findByIdAndUserId(Long id, Long userId);
}
