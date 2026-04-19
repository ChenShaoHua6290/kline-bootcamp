package com.klinebootcamp.dto.training;

import com.klinebootcamp.enums.TradeActionType;

import java.math.BigDecimal;

public record TrainingActionRequest(
        TradeActionType action,
        BigDecimal quantity
) {
}
