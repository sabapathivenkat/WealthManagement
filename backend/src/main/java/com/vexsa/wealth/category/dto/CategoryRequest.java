package com.vexsa.wealth.category.dto;

import com.vexsa.wealth.common.CategoryKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CategoryRequest(
        @NotBlank String name,
        @NotNull CategoryKind kind
) {
}
