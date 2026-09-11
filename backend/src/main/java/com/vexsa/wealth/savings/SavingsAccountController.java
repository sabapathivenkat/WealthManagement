package com.vexsa.wealth.savings;

import com.vexsa.wealth.savings.dto.ContributionRequest;
import com.vexsa.wealth.savings.dto.SavingsAccountRequest;
import com.vexsa.wealth.savings.dto.SavingsAccountResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/savings")
@RequiredArgsConstructor
public class SavingsAccountController {

    private final SavingsAccountService savingsAccountService;

    @GetMapping
    public List<SavingsAccountResponse> list() {
        return savingsAccountService.list();
    }

    @PostMapping
    public ResponseEntity<SavingsAccountResponse> create(@Valid @RequestBody SavingsAccountRequest request) {
        return ResponseEntity.ok(savingsAccountService.create(request));
    }

    @PutMapping("/{id}")
    public SavingsAccountResponse update(@PathVariable Long id, @Valid @RequestBody SavingsAccountRequest request) {
        return savingsAccountService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        savingsAccountService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/archive")
    public SavingsAccountResponse archive(@PathVariable Long id) {
        return savingsAccountService.archive(id);
    }

    @PostMapping("/{id}/unarchive")
    public SavingsAccountResponse unarchive(@PathVariable Long id) {
        return savingsAccountService.unarchive(id);
    }

    @PostMapping("/{id}/contributions")
    public SavingsAccountResponse contribute(@PathVariable Long id, @Valid @RequestBody ContributionRequest request) {
        return savingsAccountService.contribute(id, request);
    }

    @PostMapping("/{id}/withdrawals")
    public SavingsAccountResponse withdraw(@PathVariable Long id, @Valid @RequestBody ContributionRequest request) {
        return savingsAccountService.withdraw(id, request);
    }
}
