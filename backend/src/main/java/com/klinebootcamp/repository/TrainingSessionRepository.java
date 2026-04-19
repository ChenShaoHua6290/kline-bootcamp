package com.klinebootcamp.repository;

import com.klinebootcamp.entity.TrainingSession;
import com.klinebootcamp.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrainingSessionRepository extends JpaRepository<TrainingSession, Long> {
    List<TrainingSession> findTop30ByUserOrderByIdDesc(User user);
}
