package com.klinebootcamp.entity;

import com.klinebootcamp.enums.Timeframe;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "training_sessions")
public class TrainingSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "instrument_id", nullable = false)
    private Instrument instrument;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private Timeframe timeframe;

    @Column(nullable = false)
    private int contextSize;

    @Column(nullable = false)
    private int targetSize;

    @Column(nullable = false)
    private long startOffset;

    @Column(nullable = false)
    private int currentStep;

    @Column(nullable = false, precision = 20, scale = 4)
    private BigDecimal initialBalance;

    @Column(nullable = false, precision = 20, scale = 4)
    private BigDecimal cashBalance;

    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal positionQty;

    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal avgPrice;

    @Column(nullable = false, precision = 20, scale = 4)
    private BigDecimal realizedPnl;

    @Column(nullable = false)
    private boolean finished;

    @Column(nullable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Instrument getInstrument() { return instrument; }
    public void setInstrument(Instrument instrument) { this.instrument = instrument; }
    public Timeframe getTimeframe() { return timeframe; }
    public void setTimeframe(Timeframe timeframe) { this.timeframe = timeframe; }
    public int getContextSize() { return contextSize; }
    public void setContextSize(int contextSize) { this.contextSize = contextSize; }
    public int getTargetSize() { return targetSize; }
    public void setTargetSize(int targetSize) { this.targetSize = targetSize; }
    public long getStartOffset() { return startOffset; }
    public void setStartOffset(long startOffset) { this.startOffset = startOffset; }
    public int getCurrentStep() { return currentStep; }
    public void setCurrentStep(int currentStep) { this.currentStep = currentStep; }
    public BigDecimal getInitialBalance() { return initialBalance; }
    public void setInitialBalance(BigDecimal initialBalance) { this.initialBalance = initialBalance; }
    public BigDecimal getCashBalance() { return cashBalance; }
    public void setCashBalance(BigDecimal cashBalance) { this.cashBalance = cashBalance; }
    public BigDecimal getPositionQty() { return positionQty; }
    public void setPositionQty(BigDecimal positionQty) { this.positionQty = positionQty; }
    public BigDecimal getAvgPrice() { return avgPrice; }
    public void setAvgPrice(BigDecimal avgPrice) { this.avgPrice = avgPrice; }
    public BigDecimal getRealizedPnl() { return realizedPnl; }
    public void setRealizedPnl(BigDecimal realizedPnl) { this.realizedPnl = realizedPnl; }
    public boolean isFinished() { return finished; }
    public void setFinished(boolean finished) { this.finished = finished; }
    public Instant getCreatedAt() { return createdAt; }
}

