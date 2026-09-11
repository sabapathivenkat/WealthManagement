package com.vexsa.wealth.debt;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "debts")
@Getter
@Setter
@NoArgsConstructor
public class Debt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String name;

    @Column(name = "debt_category_id", nullable = false)
    private Long debtCategoryId;

    @Column(name = "original_amount", nullable = false)
    private BigDecimal originalAmount;

    @Column(name = "interest_rate")
    private BigDecimal interestRate;

    @Column(name = "emi_amount")
    private BigDecimal emiAmount;

    @Column(name = "min_payment")
    private BigDecimal minPayment;

    @Column(name = "remaining_months")
    private Integer remainingMonths;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "expected_end_date")
    private LocalDate expectedEndDate;

    @Column(name = "due_day")
    private Integer dueDay;

    @Column(name = "interest_bearing", nullable = false)
    private boolean interestBearing = true;

    private Integer priority;

    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DebtStatus status = DebtStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }
}
