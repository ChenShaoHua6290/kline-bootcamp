package com.klinebootcamp.service;

import com.klinebootcamp.dto.market.CandleBatchUpsertRequest;
import com.klinebootcamp.dto.market.CandleUpsertItem;
import com.klinebootcamp.dto.market.InstrumentUpsertRequest;
import com.klinebootcamp.entity.Instrument;
import com.klinebootcamp.entity.KlineCandle;
import com.klinebootcamp.repository.InstrumentRepository;
import com.klinebootcamp.repository.KlineCandleRepository;
import javax.transaction.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class MarketDataService {
    private final InstrumentRepository instrumentRepository;
    private final KlineCandleRepository candleRepository;

    public MarketDataService(InstrumentRepository instrumentRepository, KlineCandleRepository candleRepository) {
        this.instrumentRepository = instrumentRepository;
        this.candleRepository = candleRepository;
    }

    @Transactional
    public Instrument upsertInstrument(InstrumentUpsertRequest request) {
        Instrument instrument = instrumentRepository.findBySymbol(request.getSymbol().toUpperCase())
                .orElseGet(Instrument::new);
        instrument.setSymbol(request.getSymbol().toUpperCase());
        instrument.setDisplayName(request.getDisplayName());
        instrument.setAssetClass(request.getAssetClass());
        instrument.setActive(true);
        return instrumentRepository.save(instrument);
    }

    @Transactional
    public int upsertCandles(CandleBatchUpsertRequest request) {
        Instrument instrument = instrumentRepository.findBySymbol(request.getSymbol().toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Instrument not found"));

        List<KlineCandle> toPersist = new ArrayList<>();
        for (CandleUpsertItem item : request.getCandles()) {
            KlineCandle candle = candleRepository.findByInstrumentAndTimeframeAndOpenTime(
                    instrument, request.getTimeframe(), item.getOpenTime()
            ).orElseGet(KlineCandle::new);

            candle.setInstrument(instrument);
            candle.setTimeframe(request.getTimeframe());
            candle.setOpenTime(item.getOpenTime());
            candle.setOpen(item.getOpen());
            candle.setHigh(item.getHigh());
            candle.setLow(item.getLow());
            candle.setClose(item.getClose());
            candle.setVolume(item.getVolume());
            toPersist.add(candle);
        }
        candleRepository.saveAll(toPersist);
        return toPersist.size();
    }
}
