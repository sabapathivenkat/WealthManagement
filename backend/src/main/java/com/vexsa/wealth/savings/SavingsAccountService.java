package com.vexsa.wealth.savings;

import com.vexsa.wealth.category.CategoryRepository;
import com.vexsa.wealth.common.BadRequestException;
import com.vexsa.wealth.common.CurrentUser;
import com.vexsa.wealth.common.ResourceNotFoundException;
import com.vexsa.wealth.common.TransactionType;
import com.vexsa.wealth.ledger.LedgerService;
import com.vexsa.wealth.savings.dto.ContributionRequest;
import com.vexsa.wealth.savings.dto.SavingsAccountRequest;
import com.vexsa.wealth.savings.dto.SavingsAccountResponse;
import com.vexsa.wealth.transaction.TransactionService;
import com.vexsa.wealth.transaction.dto.TransactionRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SavingsAccountService {

    private final SavingsAccountRepository savingsAccountRepository;
    private final CategoryRepository categoryRepository;
    private final LedgerService ledgerService;
    private final TransactionService transactionService;
    private final CurrentUser currentUser;

    public List<SavingsAccountResponse> list() {
        Map<Long, String> categoryNames = categoryNameMap();
        return savingsAccountRepository.findByUserId(currentUser.id()).stream()
                .map(a -> toResponse(a, categoryNames))
                .toList();
    }

    public SavingsAccountResponse create(SavingsAccountRequest request) {
        SavingsAccount account = new SavingsAccount();
        account.setUserId(currentUser.id());
        applyRequest(account, request);
        savingsAccountRepository.save(account);
        return toResponse(account, categoryNameMap());
    }

    public SavingsAccountResponse update(Long id, SavingsAccountRequest request) {
        SavingsAccount account = findOwned(id);
        applyRequest(account, request);
        savingsAccountRepository.save(account);
        return toResponse(account, categoryNameMap());
    }

    public SavingsAccountResponse archive(Long id) {
        SavingsAccount account = findOwned(id);
        account.setActive(false);
        savingsAccountRepository.save(account);
        return toResponse(account, categoryNameMap());
    }

    public void delete(Long id) {
        savingsAccountRepository.delete(findOwned(id));
    }

    public SavingsAccountResponse unarchive(Long id) {
        SavingsAccount account = findOwned(id);
        account.setActive(true);
        savingsAccountRepository.save(account);
        return toResponse(account, categoryNameMap());
    }

    public SavingsAccountResponse contribute(Long id, ContributionRequest request) {
        SavingsAccount account = findOwned(id);
        TransactionRequest txn = new TransactionRequest(
                null, account.getId(), null, request.amount(), TransactionType.SAVINGS_CONTRIBUTION,
                request.txnDate(), request.note(), false, request.forced());
        transactionService.create(txn);
        return toResponse(account, categoryNameMap());
    }

    public SavingsAccountResponse withdraw(Long id, ContributionRequest request) {
        SavingsAccount account = findOwned(id);
        TransactionRequest txn = new TransactionRequest(
                null, account.getId(), null, request.amount(), TransactionType.SAVINGS_WITHDRAWAL,
                request.txnDate(), request.note(), false, request.forced());
        transactionService.create(txn);
        return toResponse(account, categoryNameMap());
    }

    private void applyRequest(SavingsAccount account, SavingsAccountRequest request) {
        account.setName(request.name());
        account.setCategoryId(request.categoryId());
        account.setInitialValue(request.initialValue());
        account.setStartDate(request.startDate());
        account.setNotes(request.notes());
    }

    private SavingsAccount findOwned(Long id) {
        SavingsAccount account = savingsAccountRepository.findByIdAndUserId(id, currentUser.id());
        if (account == null) {
            throw new ResourceNotFoundException("Savings account not found");
        }
        return account;
    }

    private Map<Long, String> categoryNameMap() {
        return categoryRepository.findByUserIdIsNullOrUserId(currentUser.id()).stream()
                .collect(java.util.stream.Collectors.toMap(
                        com.vexsa.wealth.category.Category::getId,
                        com.vexsa.wealth.category.Category::getName));
    }

    private SavingsAccountResponse toResponse(SavingsAccount a, Map<Long, String> categoryNames) {
        BigDecimal currentValue = ledgerService.derivedSavingsBalance(a.getInitialValue(), a.getId(), null);
        return new SavingsAccountResponse(a.getId(), a.getName(), a.getCategoryId(),
                categoryNames.getOrDefault(a.getCategoryId(), "Unknown"),
                a.getInitialValue(), currentValue, a.getStartDate(), a.getNotes(), a.isActive());
    }
}
