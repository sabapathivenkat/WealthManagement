package com.vexsa.wealth.savings;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SavingsAccountRepository extends JpaRepository<SavingsAccount, Long> {
    List<SavingsAccount> findByUserId(Long userId);

    SavingsAccount findByIdAndUserId(Long id, Long userId);
}
