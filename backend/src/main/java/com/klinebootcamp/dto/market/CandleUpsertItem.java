package com.klinebootcamp.dto.market;

import javax.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;

public class CandleUpsertItem {
    @NotNull
    private Instant openTime;
    @NotNull
    private BigDecimal open;
    @NotNull
    private BigDecimal high;
    @NotNull
    private BigDecimal low;
    @NotNull
    private BigDecimal close;
    @NotNull
    private BigDecimal volume;

    public CandleUpsertItem() {
    }

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
