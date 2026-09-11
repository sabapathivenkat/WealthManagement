package com.vexsa.wealth.transaction;

import com.vexsa.wealth.category.Category;
import com.vexsa.wealth.category.CategoryRepository;
import com.vexsa.wealth.common.BadRequestException;
import com.vexsa.wealth.common.CurrentUser;
import com.vexsa.wealth.common.ResourceNotFoundException;
import com.vexsa.wealth.common.TransactionType;
import com.vexsa.wealth.debt.Debt;
import com.vexsa.wealth.debt.DebtRepository;
import com.vexsa.wealth.ledger.LedgerService;
import com.vexsa.wealth.savings.SavingsAccount;
import com.vexsa.wealth.savings.SavingsAccountRepository;
import com.vexsa.wealth.transaction.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final SavingsAccountRepository savingsAccountRepository;
    private final DebtRepository debtRepository;
    private final LedgerService ledgerService;
    private final CurrentUser currentUser;

    public List<TransactionResponse> list(LocalDate from, LocalDate to) {
        Long userId = currentUser.id();
        List<Transaction> transactions = (from != null && to != null)
                ? transactionRepository.findByUserIdAndTxnDateBetweenOrderByTxnDateDesc(userId, from, to)
                : transactionRepository.findByUserIdOrderByTxnDateDesc(userId);

        Map<Long, String> categoryNames = categoryNameMap();
        Map<Long, String> savingsNames = savingsNameMap();
        Map<Long, String> debtNames = debtNameMap();
        return transactions.stream().map(t -> toResponse(t, categoryNames, savingsNames, debtNames)).toList();
    }

    public TransactionResponse create(TransactionRequest request) {
        validate(request, null);
        Transaction t = new Transaction();
        t.setUserId(currentUser.id());
        apply(t, request);
        transactionRepository.save(t);
        return toResponse(t, categoryNameMap(), savingsNameMap(), debtNameMap());
    }

    public TransactionResponse update(Long id, TransactionRequest request) {
        Transaction t = findOwned(id);
        validate(request, id);
        apply(t, request);
        transactionRepository.save(t);
        return toResponse(t, categoryNameMap(), savingsNameMap(), debtNameMap());
    }

    public void delete(Long id) {
        Transaction t = findOwned(id);
        transactionRepository.delete(t);
    }

    public SummaryResponse summary(LocalDate from, LocalDate to) {
        List<Transaction> transactions = transactionRepository
                .findByUserIdAndTxnDateBetweenOrderByTxnDateDesc(currentUser.id(), from, to);

        Map<Long, String> categoryNames = categoryNameMap();

        BigDecimal totalIncome = sum(transactions, TransactionType.INCOME);
        BigDecimal totalExpense = sum(transactions, TransactionType.EXPENSE);

        Map<Long, BigDecimal> byCategory = new LinkedHashMap<>();
        for (Transaction t : transactions) {
            if (t.getType() != TransactionType.INCOME && t.getType() != TransactionType.EXPENSE) {
                continue;
            }
            byCategory.merge(t.getCategoryId(), t.getAmount(), BigDecimal::add);
        }

        List<CategoryBreakdown> breakdown = byCategory.entrySet().stream()
                .map(e -> new CategoryBreakdown(e.getKey(), categoryNames.getOrDefault(e.getKey(), "Unknown"), e.getValue()))
                .sorted(Comparator.comparing(CategoryBreakdown::amount).reversed())
                .toList();

        return new SummaryResponse(from, to, totalIncome, totalExpense, totalIncome.subtract(totalExpense), breakdown);
    }

    private void validate(TransactionRequest request, Long excludeTransactionId) {
        Long userId = currentUser.id();
        BigDecimal amount = request.amount();

        switch (request.type()) {
            case INCOME, EXPENSE -> {
                if (request.categoryId() == null) {
                    throw new BadRequestException("categoryId is required for income/expense transactions");
                }
                requirePositive(amount);
                requireOwnedCategory(request.categoryId(), userId);
            }
            case SAVINGS_CONTRIBUTION, SAVINGS_WITHDRAWAL -> {
                if (request.relatedSavingsAccountId() == null) {
                    throw new BadRequestException("relatedSavingsAccountId is required for savings transactions");
                }
                requirePositive(amount);
                SavingsAccount account = requireOwnedSavingsAccount(request.relatedSavingsAccountId(), userId);
                if (request.type() == TransactionType.SAVINGS_WITHDRAWAL) {
                    BigDecimal balance = ledgerService.derivedSavingsBalanceExcluding(
                            account.getInitialValue(), account.getId(), excludeTransactionId);
                    if (amount.compareTo(balance) > 0 && !request.forced()) {
                        throw new BadRequestException(
                                "Withdrawal of " + amount + " exceeds current balance of " + balance + ". Resubmit with force=true to override.");
                    }
                }
            }
            case DEBT_PAYMENT -> {
                if (request.relatedDebtId() == null) {
                    throw new BadRequestException("relatedDebtId is required for debt payments");
                }
                requirePositive(amount);
                Debt debt = requireOwnedDebt(request.relatedDebtId(), userId);
                BigDecimal balance = ledgerService.derivedDebtBalanceExcluding(
                        debt.getOriginalAmount(), debt.getId(), excludeTransactionId);
                if (amount.compareTo(balance) > 0 && !request.forced()) {
                    throw new BadRequestException(
                            "Payment of " + amount + " exceeds outstanding balance of " + balance + ". Resubmit with force=true to override.");
                }
            }
            case DEBT_ADJUSTMENT -> {
                if (request.relatedDebtId() == null) {
                    throw new BadRequestException("relatedDebtId is required for debt adjustments");
                }
                requireNonZero(amount);
                requireOwnedDebt(request.relatedDebtId(), userId);
            }
            case ASSET_ADJUSTMENT -> {
                if (request.relatedSavingsAccountId() == null) {
                    throw new BadRequestException("relatedSavingsAccountId is required for asset adjustments");
                }
                requireNonZero(amount);
                requireOwnedSavingsAccount(request.relatedSavingsAccountId(), userId);
            }
        }
    }

    private void requirePositive(BigDecimal amount) {
        if (amount.signum() <= 0) {
            throw new BadRequestException("Amount must be greater than zero");
        }
    }

    private void requireNonZero(BigDecimal amount) {
        if (amount.signum() == 0) {
            throw new BadRequestException("Amount cannot be zero");
        }
    }

    private void requireOwnedCategory(Long categoryId, Long userId) {
        Category category = categoryRepository.findById(categoryId).orElse(null);
        if (category == null || (category.getUserId() != null && !category.getUserId().equals(userId))) {
            throw new ResourceNotFoundException("Category not found");
        }
    }

    private SavingsAccount requireOwnedSavingsAccount(Long id, Long userId) {
        SavingsAccount account = savingsAccountRepository.findByIdAndUserId(id, userId);
        if (account == null) {
            throw new ResourceNotFoundException("Savings account not found");
        }
        return account;
    }

    private Debt requireOwnedDebt(Long id, Long userId) {
        Debt debt = debtRepository.findByIdAndUserId(id, userId);
        if (debt == null) {
            throw new ResourceNotFoundException("Debt not found");
        }
        return debt;
    }

    private void apply(Transaction t, TransactionRequest request) {
        t.setCategoryId(request.categoryId());
        t.setRelatedSavingsAccountId(request.relatedSavingsAccountId());
        t.setRelatedDebtId(request.relatedDebtId());
        t.setAmount(request.amount());
        t.setType(request.type());
        t.setTxnDate(request.txnDate());
        t.setNote(request.note());
        t.setRecurring(request.recurring());
    }

    private BigDecimal sum(List<Transaction> transactions, TransactionType type) {
        return transactions.stream()
                .filter(t -> t.getType() == type)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Transaction findOwned(Long id) {
        Transaction t = transactionRepository.findByIdAndUserId(id, currentUser.id());
        if (t == null) {
            throw new ResourceNotFoundException("Transaction not found");
        }
        return t;
    }

    private Map<Long, String> categoryNameMap() {
        Map<Long, String> map = new LinkedHashMap<>();
        categoryRepository.findByUserIdIsNullOrUserId(currentUser.id())
                .forEach(c -> map.put(c.getId(), c.getName()));
        return map;
    }

    private Map<Long, String> savingsNameMap() {
        Map<Long, String> map = new LinkedHashMap<>();
        savingsAccountRepository.findByUserId(currentUser.id())
                .forEach(a -> map.put(a.getId(), a.getName()));
        return map;
    }

    private Map<Long, String> debtNameMap() {
        Map<Long, String> map = new LinkedHashMap<>();
        debtRepository.findByUserId(currentUser.id())
                .forEach(d -> map.put(d.getId(), d.getName()));
        return map;
    }

    private TransactionResponse toResponse(Transaction t, Map<Long, String> categoryNames,
                                            Map<Long, String> savingsNames, Map<Long, String> debtNames) {
        return new TransactionResponse(
                t.getId(),
                t.getCategoryId(),
                t.getCategoryId() != null ? categoryNames.getOrDefault(t.getCategoryId(), "Unknown") : null,
                t.getRelatedSavingsAccountId(),
                t.getRelatedSavingsAccountId() != null ? savingsNames.getOrDefault(t.getRelatedSavingsAccountId(), "Unknown") : null,
                t.getRelatedDebtId(),
                t.getRelatedDebtId() != null ? debtNames.getOrDefault(t.getRelatedDebtId(), "Unknown") : null,
                t.getAmount(),
                t.getType(),
                t.getTxnDate(),
                t.getNote(),
                t.isRecurring()
        );
    }
}
