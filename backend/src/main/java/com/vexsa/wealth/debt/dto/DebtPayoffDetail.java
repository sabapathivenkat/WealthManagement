package com.vexsa.wealth.debt.dto;

import java.math.BigDecimal;

public record DebtPayoffDetail(Long debtId, String name, int payoffMonth, BigDecimal interestPaid) {
}
