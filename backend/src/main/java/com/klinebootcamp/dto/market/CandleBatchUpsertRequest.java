package com.klinebootcamp.dto.market;

import com.klinebootcamp.enums.Timeframe;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CandleBatchUpsertRequest(
        @NotBlank String symbol,
        @NotNull Timeframe timeframe,
        @NotEmpty List<@Valid CandleUpsertItem> candles
) {
}
