package com.klinebootcamp.dto.training;

import java.util.List;

public class TrainingRevealResponse {
    private Long sessionId;
    private List<CandleDto> answerCandles;

    public TrainingRevealResponse() {
    }

    public TrainingRevealResponse(Long sessionId, List<CandleDto> answerCandles) {
        this.sessionId = sessionId;
        this.answerCandles = answerCandles;
    }

    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
    public List<CandleDto> getAnswerCandles() { return answerCandles; }
    public void setAnswerCandles(List<CandleDto> answerCandles) { this.answerCandles = answerCandles; }
}
