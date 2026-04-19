package com.klinebootcamp.repository;

import com.klinebootcamp.entity.TrainingSession;
import com.klinebootcamp.entity.TrainingTrade;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrainingTradeRepository extends JpaRepository<TrainingTrade, Long> {
    List<TrainingTrade> findBySessionOrderByIdDesc(TrainingSession session);
}
