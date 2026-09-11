package com.vexsa.wealth.debt.dto;

import java.math.BigDecimal;

public record MonthlyPoint(int month, BigDecimal totalRemainingBalance) {
}
