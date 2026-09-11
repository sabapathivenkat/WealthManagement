package com.vexsa.wealth.ledger;

import com.vexsa.wealth.common.TransactionType;
import com.vexsa.wealth.transaction.Transaction;
import com.vexsa.wealth.transaction.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Central place for deriving current balances and financial aggregates from the transaction
 * ledger, so that savings/debt/dashboard/report code never re-implements this math and every
 * screen stays consistent with a single source of truth.
 */
@Service
@RequiredArgsConstructor
public class LedgerService {

    private final TransactionRepository transactionRepository;

    /** Net effect of all savings-related transactions on one account, up to (inclusive of) asOf. */
    public BigDecimal savingsNetMovement(Long savingsAccountId, LocalDate asOf) {
        return savingsNetMovement(savingsAccountId, asOf, null);
    }

    /**
     * Same as {@link #savingsNetMovement(Long, LocalDate)}, but excludes one transaction — used when
     * validating an edit to that transaction, so its own current (pre-edit) value doesn't distort the
     * balance being validated against.
     */
    public BigDecimal savingsNetMovement(Long savingsAccountId, LocalDate asOf, Long excludeTransactionId) {
        return transactionRepository.findByRelatedSavingsAccountId(savingsAccountId).stream()
                .filter(t -> asOf == null || !t.getTxnDate().isAfter(asOf))
                .filter(t -> excludeTransactionId == null || !t.getId().equals(excludeTransactionId))
                .map(this::signedSavingsAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Net effect of all debt-related transactions on one debt, up to (inclusive of) asOf. Positive = balance reduced. */
    public BigDecimal debtNetMovement(Long debtId, LocalDate asOf) {
        return debtNetMovement(debtId, asOf, null);
    }

    /** Same as {@link #debtNetMovement(Long, LocalDate)}, but excludes one transaction (see savings overload). */
    public BigDecimal debtNetMovement(Long debtId, LocalDate asOf, Long excludeTransactionId) {
        return transactionRepository.findByRelatedDebtId(debtId).stream()
                .filter(t -> asOf == null || !t.getTxnDate().isAfter(asOf))
                .filter(t -> excludeTransactionId == null || !t.getId().equals(excludeTransactionId))
                .map(this::signedDebtAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal sumForUser(Long userId, TransactionType type, LocalDate from, LocalDate to) {
        return transactionRepository.findByUserIdAndTxnDateBetweenOrderByTxnDateDesc(userId, from, to).stream()
                .filter(t -> t.getType() == type)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public List<Transaction> transactionsUpTo(Long userId, LocalDate asOf) {
        return transactionRepository.findByUserIdAndTxnDateLessThanEqual(userId, asOf);
    }

    public BigDecimal derivedSavingsBalance(BigDecimal initialValue, Long savingsAccountId, LocalDate asOf) {
        return initialValue.add(savingsNetMovement(savingsAccountId, asOf));
    }

    public BigDecimal derivedSavingsBalanceExcluding(BigDecimal initialValue, Long savingsAccountId, Long excludeTransactionId) {
        return initialValue.add(savingsNetMovement(savingsAccountId, null, excludeTransactionId));
    }

    public BigDecimal derivedDebtBalance(BigDecimal originalAmount, Long debtId, LocalDate asOf) {
        return originalAmount.subtract(debtNetMovement(debtId, asOf));
    }

    public BigDecimal derivedDebtBalanceExcluding(BigDecimal originalAmount, Long debtId, Long excludeTransactionId) {
        return originalAmount.subtract(debtNetMovement(debtId, null, excludeTransactionId));
    }

    private BigDecimal signedSavingsAmount(Transaction t) {
        if (t.getType() == TransactionType.SAVINGS_CONTRIBUTION) {
            return t.getAmount();
        }
        if (t.getType() == TransactionType.SAVINGS_WITHDRAWAL) {
            return t.getAmount().negate();
        }
        // ASSET_ADJUSTMENT carries a signed amount directly
        return t.getAmount();
    }

    private BigDecimal signedDebtAmount(Transaction t) {
        if (t.getType() == TransactionType.DEBT_PAYMENT) {
            return t.getAmount();
        }
        // DEBT_ADJUSTMENT carries a signed amount directly (positive reduces balance, negative increases it)
        return t.getAmount();
    }
}
