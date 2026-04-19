package com.klinebootcamp.controller;

import com.klinebootcamp.dto.market.CandleBatchUpsertRequest;
import com.klinebootcamp.dto.market.InstrumentUpsertRequest;
import com.klinebootcamp.entity.Instrument;
import com.klinebootcamp.service.MarketDataService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/market")
public class MarketDataController {
    private final MarketDataService marketDataService;

    public MarketDataController(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    @PostMapping("/instruments")
    public Instrument upsertInstrument(@Valid @RequestBody InstrumentUpsertRequest request) {
        return marketDataService.upsertInstrument(request);
    }

    @PostMapping("/candles:batch-upsert")
    public Map<String, Integer> upsertCandles(@Valid @RequestBody CandleBatchUpsertRequest request) {
        return Map.of("saved", marketDataService.upsertCandles(request));
    }
}
