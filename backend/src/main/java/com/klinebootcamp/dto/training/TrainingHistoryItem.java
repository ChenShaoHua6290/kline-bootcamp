package com.klinebootcamp.dto.training;

import java.math.BigDecimal;
import java.time.Instant;

public class TrainingHistoryItem {
    private Long sessionId;
    private String symbol;
    private String timeframe;
    private int totalBars;
    private int finalStep;
    private BigDecimal totalPnl;
    private Instant createdAt;

    public TrainingHistoryItem() {
    }

    public TrainingHistoryItem(Long sessionId, String symbol, String timeframe, int totalBars, int finalStep, BigDecimal totalPnl, Instant createdAt) {
        this.sessionId = sessionId;
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.totalBars = totalBars;
        this.finalStep = finalStep;
        this.totalPnl = totalPnl;
        this.createdAt = createdAt;
    }

    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }
    public String getTimeframe() { return timeframe; }
    public void setTimeframe(String timeframe) { this.timeframe = timeframe; }
    public int getTotalBars() { return totalBars; }
    public void setTotalBars(int totalBars) { this.totalBars = totalBars; }
    public int getFinalStep() { return finalStep; }
    public void setFinalStep(int finalStep) { this.finalStep = finalStep; }
    public BigDecimal getTotalPnl() { return totalPnl; }
    public void setTotalPnl(BigDecimal totalPnl) { this.totalPnl = totalPnl; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
