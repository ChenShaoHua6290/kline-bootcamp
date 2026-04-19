package com.klinebootcamp.dto.market;

import com.klinebootcamp.enums.Timeframe;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import java.util.List;

public class CandleBatchUpsertRequest {
    @NotBlank
    private String symbol;
    @NotNull
    private Timeframe timeframe;
    @NotEmpty
    private List<@Valid CandleUpsertItem> candles;

    public CandleBatchUpsertRequest() {
    }

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }
    public Timeframe getTimeframe() { return timeframe; }
    public void setTimeframe(Timeframe timeframe) { this.timeframe = timeframe; }
    public List<CandleUpsertItem> getCandles() { return candles; }
    public void setCandles(List<CandleUpsertItem> candles) { this.candles = candles; }
}
