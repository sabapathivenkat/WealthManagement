package com.vexsa.wealth.settings;

import com.vexsa.wealth.debt.PayoffStrategy;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_settings")
@Getter
@Setter
@NoArgsConstructor
public class UserSettings {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false)
    private String currency = "INR";

    @Column(name = "fy_start_month", nullable = false)
    private int fyStartMonth = 4;

    @Enumerated(EnumType.STRING)
    @Column(name = "default_debt_strategy", nullable = false)
    private PayoffStrategy defaultDebtStrategy = PayoffStrategy.AVALANCHE;
}
