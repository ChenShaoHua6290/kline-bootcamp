package com.klinebootcamp.dto.training;

import java.math.BigDecimal;
import java.util.List;

public class TrainingPanelResponse {
    private Long sessionId;
    private String symbol;
    private String timeframe;
    private int totalBars;
    private int currentStep;
    private boolean finished;
    private BigDecimal initialBalance;
    private BigDecimal cashBalance;
    private BigDecimal positionQty;
    private BigDecimal avgPrice;
    private BigDecimal lastPrice;
    private BigDecimal realizedPnl;
    private BigDecimal floatingPnl;
    private BigDecimal totalPnl;
    private List<CandleDto> visibleCandles;
    private List<TrainingTradeDto> recentTrades;

    public TrainingPanelResponse() {
    }

    public TrainingPanelResponse(Long sessionId, String symbol, String timeframe, int totalBars, int currentStep, boolean finished,
                                 BigDecimal initialBalance, BigDecimal cashBalance, BigDecimal positionQty, BigDecimal avgPrice,
                                 BigDecimal lastPrice, BigDecimal realizedPnl, BigDecimal floatingPnl, BigDecimal totalPnl,
                                 List<CandleDto> visibleCandles, List<TrainingTradeDto> recentTrades) {
        this.sessionId = sessionId;
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.totalBars = totalBars;
        this.currentStep = currentStep;
        this.finished = finished;
        this.initialBalance = initialBalance;
        this.cashBalance = cashBalance;
        this.positionQty = positionQty;
        this.avgPrice = avgPrice;
        this.lastPrice = lastPrice;
        this.realizedPnl = realizedPnl;
        this.floatingPnl = floatingPnl;
        this.totalPnl = totalPnl;
        this.visibleCandles = visibleCandles;
        this.recentTrades = recentTrades;
    }

    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }
    public String getTimeframe() { return timeframe; }
    public void setTimeframe(String timeframe) { this.timeframe = timeframe; }
    public int getTotalBars() { return totalBars; }
    public void setTotalBars(int totalBars) { this.totalBars = totalBars; }
    public int getCurrentStep() { return currentStep; }
    public void setCurrentStep(int currentStep) { this.currentStep = currentStep; }
    public boolean isFinished() { return finished; }
    public void setFinished(boolean finished) { this.finished = finished; }
    public BigDecimal getInitialBalance() { return initialBalance; }
    public void setInitialBalance(BigDecimal initialBalance) { this.initialBalance = initialBalance; }
    public BigDecimal getCashBalance() { return cashBalance; }
    public void setCashBalance(BigDecimal cashBalance) { this.cashBalance = cashBalance; }
    public BigDecimal getPositionQty() { return positionQty; }
    public void setPositionQty(BigDecimal positionQty) { this.positionQty = positionQty; }
    public BigDecimal getAvgPrice() { return avgPrice; }
    public void setAvgPrice(BigDecimal avgPrice) { this.avgPrice = avgPrice; }
    public BigDecimal getLastPrice() { return lastPrice; }
    public void setLastPrice(BigDecimal lastPrice) { this.lastPrice = lastPrice; }
    public BigDecimal getRealizedPnl() { return realizedPnl; }
    public void setRealizedPnl(BigDecimal realizedPnl) { this.realizedPnl = realizedPnl; }
    public BigDecimal getFloatingPnl() { return floatingPnl; }
    public void setFloatingPnl(BigDecimal floatingPnl) { this.floatingPnl = floatingPnl; }
    public BigDecimal getTotalPnl() { return totalPnl; }
    public void setTotalPnl(BigDecimal totalPnl) { this.totalPnl = totalPnl; }
    public List<CandleDto> getVisibleCandles() { return visibleCandles; }
    public void setVisibleCandles(List<CandleDto> visibleCandles) { this.visibleCandles = visibleCandles; }
    public List<TrainingTradeDto> getRecentTrades() { return recentTrades; }
    public void setRecentTrades(List<TrainingTradeDto> recentTrades) { this.recentTrades = recentTrades; }
}
