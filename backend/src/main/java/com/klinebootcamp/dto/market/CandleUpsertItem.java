package com.klinebootcamp.dto.market;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;

public record CandleUpsertItem(
        @NotNull Instant openTime,
        @NotNull BigDecimal open,
        @NotNull BigDecimal high,
        @NotNull BigDecimal low,
        @NotNull BigDecimal close,
        @NotNull BigDecimal volume
) {
}
