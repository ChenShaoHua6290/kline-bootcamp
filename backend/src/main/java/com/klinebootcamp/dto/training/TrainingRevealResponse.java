package com.klinebootcamp.dto.training;

import java.util.List;

public record TrainingRevealResponse(
        Long sessionId,
        List<CandleDto> answerCandles
) {
}
