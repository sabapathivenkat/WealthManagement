package com.vexsa.wealth.debt;

import com.vexsa.wealth.debt.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/debts")
@RequiredArgsConstructor
public class DebtController {

    private final DebtService debtService;

    @GetMapping
    public List<DebtResponse> list() {
        return debtService.list();
    }

    @PostMapping
    public ResponseEntity<DebtResponse> create(@Valid @RequestBody DebtRequest request) {
        return ResponseEntity.ok(debtService.create(request));
    }

    @PutMapping("/{id}")
    public DebtResponse update(@PathVariable Long id, @Valid @RequestBody DebtRequest request) {
        return debtService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        debtService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/payments")
    public DebtResponse recordPayment(@PathVariable Long id, @Valid @RequestBody PaymentRequest request) {
        return debtService.recordPayment(id, request.amount(), request.txnDate(), request.note(), request.forced());
    }

    @GetMapping("/payoff-plan")
    public PayoffComparisonResponse payoffPlan(@RequestParam(required = false) BigDecimal extraPayment) {
        return debtService.payoffPlan(extraPayment);
    }

    @GetMapping("/payoff-plan/custom")
    public StrategyResult customPlan(@RequestParam(required = false) BigDecimal extraPayment) {
        return debtService.customPlan(extraPayment);
    }

    @GetMapping("/recommendation")
    public List<DebtRecommendation> recommendation() {
        return debtService.recommendation();
    }

    @GetMapping("/smart-plan")
    public SmartPlanResponse smartPlan() {
        return debtService.smartPlan();
    }
}
