package com.klinebootcamp.dto.training;

import com.klinebootcamp.enums.Timeframe;

import java.util.List;

public class TrainingSessionResponse {
    private Long sessionId;
    private String symbol;
    private String displayName;
    private Timeframe timeframe;
    private int contextSize;
    private int targetSize;
    private List<CandleDto> contextCandles;

    public TrainingSessionResponse() {
    }

    public TrainingSessionResponse(Long sessionId, String symbol, String displayName, Timeframe timeframe, int contextSize, int targetSize, List<CandleDto> contextCandles) {
        this.sessionId = sessionId;
        this.symbol = symbol;
        this.displayName = displayName;
        this.timeframe = timeframe;
        this.contextSize = contextSize;
        this.targetSize = targetSize;
        this.contextCandles = contextCandles;
    }

    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public Timeframe getTimeframe() { return timeframe; }
    public void setTimeframe(Timeframe timeframe) { this.timeframe = timeframe; }
    public int getContextSize() { return contextSize; }
    public void setContextSize(int contextSize) { this.contextSize = contextSize; }
    public int getTargetSize() { return targetSize; }
    public void setTargetSize(int targetSize) { this.targetSize = targetSize; }
    public List<CandleDto> getContextCandles() { return contextCandles; }
    public void setContextCandles(List<CandleDto> contextCandles) { this.contextCandles = contextCandles; }
}
