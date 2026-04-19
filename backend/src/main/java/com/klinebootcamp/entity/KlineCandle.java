package com.klinebootcamp.entity;

import com.klinebootcamp.enums.Timeframe;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "kline_candles", uniqueConstraints = {
        @UniqueConstraint(name = "uk_candle_inst_tf_open", columnNames = {"instrument_id", "timeframe", "open_time"})
}, indexes = {
        @Index(name = "idx_candle_inst_tf_time", columnList = "instrument_id,timeframe,open_time")
})
public class KlineCandle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "instrument_id", nullable = false)
    private Instrument instrument;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private Timeframe timeframe;

    @Column(name = "open_time", nullable = false)
    private Instant openTime;

    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal open;

    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal high;

    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal low;

    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal close;

    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal volume;

    public Long getId() { return id; }
    public Instrument getInstrument() { return instrument; }
    public void setInstrument(Instrument instrument) { this.instrument = instrument; }
    public Timeframe getTimeframe() { return timeframe; }
    public void setTimeframe(Timeframe timeframe) { this.timeframe = timeframe; }
    public Instant getOpenTime() { return openTime; }
    public void setOpenTime(Instant openTime) { this.openTime = openTime; }
    public BigDecimal getOpen() { return open; }
    public void setOpen(BigDecimal open) { this.open = open; }
    public BigDecimal getHigh() { return high; }
    public void setHigh(BigDecimal high) { this.high = high; }
    public BigDecimal getLow() { return low; }
    public void setLow(BigDecimal low) { this.low = low; }
    public BigDecimal getClose() { return close; }
    public void setClose(BigDecimal close) { this.close = close; }
    public BigDecimal getVolume() { return volume; }
    public void setVolume(BigDecimal volume) { this.volume = volume; }
}
