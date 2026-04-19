package com.klinebootcamp.dto.training;

import java.math.BigDecimal;
import java.time.Instant;

public record TrainingHistoryItem(
        Long sessionId,
        String symbol,
        String timeframe,
        int totalBars,
        int finalStep,
        BigDecimal totalPnl,
        Instant createdAt
) {
}
