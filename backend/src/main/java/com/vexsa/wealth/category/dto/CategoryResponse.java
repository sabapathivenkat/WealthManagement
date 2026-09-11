package com.vexsa.wealth.category.dto;

import com.vexsa.wealth.common.CategoryKind;

public record CategoryResponse(Long id, String name, CategoryKind kind, boolean isDefault, boolean active) {
}
