package com.klinebootcamp.repository;

import com.klinebootcamp.entity.Instrument;
import com.klinebootcamp.entity.KlineCandle;
import com.klinebootcamp.enums.Timeframe;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface KlineCandleRepository extends JpaRepository<KlineCandle, Long> {
    long countByInstrumentAndTimeframe(Instrument instrument, Timeframe timeframe);

    List<KlineCandle> findByInstrumentAndTimeframeOrderByOpenTimeAsc(Instrument instrument, Timeframe timeframe, Pageable pageable);

    Optional<KlineCandle> findByInstrumentAndTimeframeAndOpenTime(Instrument instrument, Timeframe timeframe, Instant openTime);
}
