package com.klinebootcamp.dto.training;

import com.klinebootcamp.enums.Timeframe;

import java.util.List;

public record TrainingSessionResponse(
        Long sessionId,
        String symbol,
        String displayName,
        Timeframe timeframe,
        int contextSize,
        int targetSize,
        List<CandleDto> contextCandles
) {
}
