package com.vexsa.wealth.auth.dto;

public record AuthResponse(String token, String email, String name) {
}
