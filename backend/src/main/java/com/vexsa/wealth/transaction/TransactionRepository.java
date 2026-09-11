package com.vexsa.wealth.transaction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserIdAndTxnDateBetweenOrderByTxnDateDesc(Long userId, LocalDate from, LocalDate to);

    List<Transaction> findByUserIdOrderByTxnDateDesc(Long userId);

    Transaction findByIdAndUserId(Long id, Long userId);

    List<Transaction> findByRelatedSavingsAccountId(Long relatedSavingsAccountId);

    List<Transaction> findByRelatedDebtId(Long relatedDebtId);

    List<Transaction> findByUserIdAndTxnDateLessThanEqual(Long userId, LocalDate asOf);
}
