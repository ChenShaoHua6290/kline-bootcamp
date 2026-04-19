package com.klinebootcamp.entity;

import com.klinebootcamp.enums.Timeframe;
import jakarta.persistence.*;

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
}
