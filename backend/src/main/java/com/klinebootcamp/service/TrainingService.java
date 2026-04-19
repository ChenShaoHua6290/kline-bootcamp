package com.klinebootcamp.service;

import com.klinebootcamp.dto.training.*;
import com.klinebootcamp.entity.Instrument;
import com.klinebootcamp.entity.KlineCandle;
import com.klinebootcamp.entity.TrainingSession;
import com.klinebootcamp.entity.User;
import com.klinebootcamp.enums.AssetClass;
import com.klinebootcamp.enums.Timeframe;
import com.klinebootcamp.repository.InstrumentRepository;
import com.klinebootcamp.repository.KlineCandleRepository;
import com.klinebootcamp.repository.TrainingSessionRepository;
import com.klinebootcamp.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class TrainingService {
    private final KlineCandleRepository candleRepository;
    private final InstrumentRepository instrumentRepository;
    private final TrainingSessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final SecureRandom random = new SecureRandom();

    public TrainingService(KlineCandleRepository candleRepository,
                           InstrumentRepository instrumentRepository,
                           TrainingSessionRepository sessionRepository,
                           UserRepository userRepository) {
        this.candleRepository = candleRepository;
        this.instrumentRepository = instrumentRepository;
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
    }

    public TrainingSessionResponse createRandomSession(String email, CreateTrainingRequest request) {
        Timeframe timeframe = request.timeframe() == null ? Timeframe.H1 : request.timeframe();
        int context = request.contextSize() == null ? 120 : request.contextSize();
        int target = request.targetSize() == null ? 30 : request.targetSize();

        Instrument instrument = resolveInstrument(request.assetClass(), request.symbol());
        long total = candleRepository.countByInstrumentAndTimeframe(instrument, timeframe);
        if (total < context + target + 1L) {
            throw new ResponseStatusException(BAD_REQUEST, "Not enough candles for this timeframe");
        }

        int maxStart = Math.toIntExact(total - context - target);
        int start = random.nextInt(maxStart + 1);
        int take = context + target;

        List<KlineCandle> sampled = candleRepository.findByInstrumentAndTimeframeOrderByOpenTimeAsc(
                instrument, timeframe, PageRequest.of(start, take)
        );

        if (sampled.size() < take) {
            throw new ResponseStatusException(BAD_REQUEST, "Could not create random window");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));

        TrainingSession session = new TrainingSession();
        session.setUser(user);
        session.setInstrument(instrument);
        session.setTimeframe(timeframe);
        session.setContextSize(context);
        session.setTargetSize(target);
        session.setStartOffset(start);
        session = sessionRepository.save(session);

        List<CandleDto> contextCandles = sampled.subList(0, context).stream().map(this::toDto).collect(Collectors.toList());

        return new TrainingSessionResponse(
                session.getId(),
                instrument.getSymbol(),
                instrument.getDisplayName(),
                timeframe,
                context,
                target,
                contextCandles
        );
    }

    public TrainingRevealResponse reveal(Long sessionId, String email) {
        TrainingSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Session not found"));
        if (!session.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new ResponseStatusException(BAD_REQUEST, "Session does not belong to current user");
        }

        int offset = Math.toIntExact(session.getStartOffset() + session.getContextSize());
        List<KlineCandle> target = candleRepository.findByInstrumentAndTimeframeOrderByOpenTimeAsc(
                session.getInstrument(),
                session.getTimeframe(),
                PageRequest.of(offset, session.getTargetSize())
        );
        return new TrainingRevealResponse(
                session.getId(),
                target.stream().sorted(Comparator.comparing(KlineCandle::getOpenTime)).map(this::toDto).toList()
        );
    }

    private Instrument resolveInstrument(AssetClass assetClass, String symbol) {
        if (symbol != null && !symbol.isBlank()) {
            return instrumentRepository.findBySymbol(symbol.toUpperCase())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Symbol not found"));
        }

        if (assetClass != null) {
            List<Instrument> list = instrumentRepository.findByAssetClassAndActiveTrue(assetClass);
            if (list.isEmpty()) {
                throw new ResponseStatusException(NOT_FOUND, "No instrument for asset class");
            }
            return list.get(random.nextInt(list.size()));
        }

        List<Instrument> all = instrumentRepository.findByActiveTrue();
        if (all.isEmpty()) {
            throw new ResponseStatusException(NOT_FOUND, "No active instrument");
        }
        return all.get(random.nextInt(all.size()));
    }

    private CandleDto toDto(KlineCandle candle) {
        return new CandleDto(
                candle.getOpenTime().toEpochMilli(),
                candle.getOpen(),
                candle.getHigh(),
                candle.getLow(),
                candle.getClose(),
                candle.getVolume()
        );
    }
}
