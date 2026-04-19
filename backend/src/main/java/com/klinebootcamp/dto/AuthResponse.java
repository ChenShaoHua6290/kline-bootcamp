package com.klinebootcamp.dto;

public record AuthResponse(
        String token,
        String email
) {
}
