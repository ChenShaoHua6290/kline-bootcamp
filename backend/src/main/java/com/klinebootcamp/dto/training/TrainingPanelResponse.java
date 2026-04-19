package com.klinebootcamp.dto.training;

import java.math.BigDecimal;
import java.util.List;

public record TrainingPanelResponse(
        Long sessionId,
        String symbol,
        String timeframe,
        int totalBars,
        int currentStep,
        boolean finished,
        BigDecimal initialBalance,
        BigDecimal cashBalance,
        BigDecimal positionQty,
        BigDecimal avgPrice,
        BigDecimal lastPrice,
        BigDecimal realizedPnl,
        BigDecimal floatingPnl,
        BigDecimal totalPnl,
        List<CandleDto> visibleCandles,
        List<TrainingTradeDto> recentTrades
) {
}
