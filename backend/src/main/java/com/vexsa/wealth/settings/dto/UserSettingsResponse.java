package com.vexsa.wealth.settings.dto;

import com.vexsa.wealth.debt.PayoffStrategy;

public record UserSettingsResponse(String currency, int fyStartMonth, PayoffStrategy defaultDebtStrategy) {
}
