package com.vexsa.wealth.transaction.dto;

import java.math.BigDecimal;

public record CategoryBreakdown(Long categoryId, String categoryName, BigDecimal amount) {
}
