package com.klinebootcamp.dto.training;

import java.math.BigDecimal;

public record CandleDto(
        long timestamp,
        BigDecimal open,
        BigDecimal high,
        BigDecimal low,
        BigDecimal close,
        BigDecimal volume
) {
}
