package com.klinebootcamp.dto.training;

import com.klinebootcamp.enums.TradeActionType;

import java.math.BigDecimal;

public record TrainingTradeDto(
        TradeActionType action,
        BigDecimal quantity,
        BigDecimal price
) {
}
