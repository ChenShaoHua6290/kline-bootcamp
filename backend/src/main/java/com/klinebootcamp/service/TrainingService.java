package com.klinebootcamp.service;

import com.klinebootcamp.dto.training.*;
import com.klinebootcamp.entity.*;
import com.klinebootcamp.enums.AssetClass;
import com.klinebootcamp.enums.Timeframe;
import com.klinebootcamp.enums.TradeActionType;
import com.klinebootcamp.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class TrainingService {
    private static final BigDecimal DEFAULT_BALANCE = new BigDecimal("50000");

    private final KlineCandleRepository candleRepository;
    private final InstrumentRepository instrumentRepository;
    private final TrainingSessionRepository sessionRepository;
    private final TrainingTradeRepository tradeRepository;
    private final UserRepository userRepository;
    private final SecureRandom random = new SecureRandom();

    public TrainingService(KlineCandleRepository candleRepository,
                           InstrumentRepository instrumentRepository,
                           TrainingSessionRepository sessionRepository,
                           TrainingTradeRepository tradeRepository,
                           UserRepository userRepository) {
        this.candleRepository = candleRepository;
        this.instrumentRepository = instrumentRepository;
        this.sessionRepository = sessionRepository;
        this.tradeRepository = tradeRepository;
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
        session.setCurrentStep(context);
        session.setInitialBalance(DEFAULT_BALANCE);
        session.setCashBalance(DEFAULT_BALANCE);
        session.setPositionQty(BigDecimal.ZERO);
        session.setAvgPrice(BigDecimal.ZERO);
        session.setRealizedPnl(BigDecimal.ZERO);
        session.setFinished(false);
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

    @Transactional
    public TrainingPanelResponse performAction(Long sessionId, String email, TrainingActionRequest request) {
        TrainingSession session = loadOwnedSession(sessionId, email);
        TradeActionType action = request.action();
        if (action == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Action is required");
        }
        if (session.isFinished() && action != TradeActionType.RESTART) {
            throw new ResponseStatusException(BAD_REQUEST, "Session already finished");
        }

        BigDecimal lastPrice = currentPrice(session);
        BigDecimal qty = request.quantity() == null ? BigDecimal.ONE : request.quantity();
        if (qty.compareTo(BigDecimal.ZERO) <= 0) {
            qty = BigDecimal.ONE;
        }

        switch (action) {
            case BUY -> applyBuy(session, qty, lastPrice);
            case SELL -> applySell(session, qty, lastPrice);
            case SHORT -> applyShort(session, qty, lastPrice);
            case COVER -> applyCover(session, qty, lastPrice);
            case NEXT_BAR -> moveNext(session);
            case RESTART -> resetSession(session);
            case FINISH -> session.setFinished(true);
        }

        if (action == TradeActionType.BUY || action == TradeActionType.SELL
                || action == TradeActionType.SHORT || action == TradeActionType.COVER) {
            TrainingTrade trade = new TrainingTrade();
            trade.setSession(session);
            trade.setAction(action);
            trade.setQuantity(qty);
            trade.setPrice(lastPrice);
            tradeRepository.save(trade);
        }

        sessionRepository.save(session);
        return buildPanel(session);
    }

    public TrainingPanelResponse getPanel(Long sessionId, String email) {
        TrainingSession session = loadOwnedSession(sessionId, email);
        return buildPanel(session);
    }

    public List<TrainingHistoryItem> history(String email) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
        return sessionRepository.findTop30ByUserOrderByIdDesc(user).stream().map(session -> {
            BigDecimal total = calcTotalPnl(session, currentPrice(session));
            return new TrainingHistoryItem(
                    session.getId(),
                    session.getInstrument().getSymbol(),
                    session.getTimeframe().name(),
                    session.getTargetSize(),
                    session.getCurrentStep(),
                    total,
                    session.getCreatedAt()
            );
        }).toList();
    }

    public TrainingRevealResponse reveal(Long sessionId, String email) {
        TrainingSession session = loadOwnedSession(sessionId, email);
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

    private TrainingSession loadOwnedSession(Long sessionId, String email) {
        TrainingSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Session not found"));
        if (!session.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new ResponseStatusException(BAD_REQUEST, "Session does not belong to current user");
        }
        return session;
    }

    private TrainingPanelResponse buildPanel(TrainingSession session) {
        int visible = session.getCurrentStep();
        List<KlineCandle> bars = candleRepository.findByInstrumentAndTimeframeOrderByOpenTimeAsc(
                session.getInstrument(),
                session.getTimeframe(),
                PageRequest.of((int) session.getStartOffset(), visible)
        );
        BigDecimal lastPrice = bars.isEmpty() ? BigDecimal.ZERO : bars.get(bars.size() - 1).getClose();
        BigDecimal floating = session.getPositionQty().multiply(lastPrice.subtract(session.getAvgPrice()));
        BigDecimal totalPnl = session.getRealizedPnl().add(floating);

        List<TrainingTradeDto> trades = tradeRepository.findBySessionOrderByIdDesc(session).stream()
                .limit(8)
                .map(t -> new TrainingTradeDto(t.getAction(), t.getQuantity(), t.getPrice()))
                .toList();

        return new TrainingPanelResponse(
                session.getId(),
                session.getInstrument().getSymbol(),
                session.getTimeframe().name(),
                session.getTargetSize(),
                session.getCurrentStep(),
                session.isFinished(),
                scale4(session.getInitialBalance()),
                scale4(session.getCashBalance()),
                session.getPositionQty(),
                session.getAvgPrice(),
                lastPrice,
                scale4(session.getRealizedPnl()),
                scale4(floating),
                scale4(totalPnl),
                bars.stream().map(this::toDto).toList(),
                trades
        );
    }

    private BigDecimal currentPrice(TrainingSession session) {
        int offset = (int) session.getStartOffset() + Math.max(session.getCurrentStep() - 1, 0);
        List<KlineCandle> bars = candleRepository.findByInstrumentAndTimeframeOrderByOpenTimeAsc(
                session.getInstrument(), session.getTimeframe(), PageRequest.of(offset, 1)
        );
        if (bars.isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "No current bar");
        }
        return bars.get(0).getClose();
    }

    private void moveNext(TrainingSession session) {
        if (session.getCurrentStep() >= session.getContextSize() + session.getTargetSize()) {
            session.setFinished(true);
            return;
        }
        session.setCurrentStep(session.getCurrentStep() + 1);
    }

    private void resetSession(TrainingSession session) {
        session.setCurrentStep(session.getContextSize());
        session.setInitialBalance(DEFAULT_BALANCE);
        session.setCashBalance(DEFAULT_BALANCE);
        session.setPositionQty(BigDecimal.ZERO);
        session.setAvgPrice(BigDecimal.ZERO);
        session.setRealizedPnl(BigDecimal.ZERO);
        session.setFinished(false);
    }

    private void applyBuy(TrainingSession session, BigDecimal qty, BigDecimal price) {
        if (session.getPositionQty().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Current position is short, use COVER first");
        }
        BigDecimal cost = qty.multiply(price);
        if (session.getCashBalance().compareTo(cost) < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Insufficient cash");
        }
        BigDecimal newQty = session.getPositionQty().add(qty);
        BigDecimal weightedCost = session.getAvgPrice().multiply(session.getPositionQty()).add(cost);
        session.setPositionQty(newQty);
        session.setAvgPrice(newQty.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO : weightedCost.divide(newQty, 8, RoundingMode.HALF_UP));
        session.setCashBalance(session.getCashBalance().subtract(cost));
    }

    private void applySell(TrainingSession session, BigDecimal qty, BigDecimal price) {
        if (session.getPositionQty().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "No long position");
        }
        if (qty.compareTo(session.getPositionQty()) > 0) {
            qty = session.getPositionQty();
        }
        BigDecimal proceeds = qty.multiply(price);
        BigDecimal pnl = qty.multiply(price.subtract(session.getAvgPrice()));
        session.setPositionQty(session.getPositionQty().subtract(qty));
        if (session.getPositionQty().compareTo(BigDecimal.ZERO) == 0) {
            session.setAvgPrice(BigDecimal.ZERO);
        }
        session.setCashBalance(session.getCashBalance().add(proceeds));
        session.setRealizedPnl(session.getRealizedPnl().add(pnl));
    }

    private void applyShort(TrainingSession session, BigDecimal qty, BigDecimal price) {
        if (session.getPositionQty().compareTo(BigDecimal.ZERO) > 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Current position is long, use SELL first");
        }
        BigDecimal newQty = session.getPositionQty().subtract(qty);
        BigDecimal weighted = session.getAvgPrice().multiply(session.getPositionQty().abs()).add(qty.multiply(price));
        session.setPositionQty(newQty);
        session.setAvgPrice(weighted.divide(newQty.abs(), 8, RoundingMode.HALF_UP));
        session.setCashBalance(session.getCashBalance().add(qty.multiply(price)));
    }

    private void applyCover(TrainingSession session, BigDecimal qty, BigDecimal price) {
        if (session.getPositionQty().compareTo(BigDecimal.ZERO) >= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "No short position");
        }
        BigDecimal shortQty = session.getPositionQty().abs();
        if (qty.compareTo(shortQty) > 0) {
            qty = shortQty;
        }
        BigDecimal cost = qty.multiply(price);
        session.setCashBalance(session.getCashBalance().subtract(cost));
        BigDecimal pnl = qty.multiply(session.getAvgPrice().subtract(price));
        session.setRealizedPnl(session.getRealizedPnl().add(pnl));
        BigDecimal remaining = shortQty.subtract(qty);
        session.setPositionQty(remaining.negate());
        if (remaining.compareTo(BigDecimal.ZERO) == 0) {
            session.setAvgPrice(BigDecimal.ZERO);
        }
    }

    private BigDecimal calcTotalPnl(TrainingSession session, BigDecimal lastPrice) {
        BigDecimal floating = session.getPositionQty().multiply(lastPrice.subtract(session.getAvgPrice()));
        return scale4(session.getRealizedPnl().add(floating));
    }

    private BigDecimal scale4(BigDecimal value) {
        return value.setScale(4, RoundingMode.HALF_UP);
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
