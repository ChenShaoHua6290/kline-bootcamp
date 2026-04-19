package com.klinebootcamp.controller;

import com.klinebootcamp.dto.training.CreateTrainingRequest;
import com.klinebootcamp.dto.training.TrainingRevealResponse;
import com.klinebootcamp.dto.training.TrainingSessionResponse;
import com.klinebootcamp.service.TrainingService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/training")
public class TrainingController {
    private final TrainingService trainingService;

    public TrainingController(TrainingService trainingService) {
        this.trainingService = trainingService;
    }

    @PostMapping("/random")
    public TrainingSessionResponse random(@RequestBody CreateTrainingRequest request, Authentication authentication) {
        return trainingService.createRandomSession(authentication.getName(), request);
    }

    @PostMapping("/{sessionId}/reveal")
    public TrainingRevealResponse reveal(@PathVariable Long sessionId, Authentication authentication) {
        return trainingService.reveal(sessionId, authentication.getName());
    }
}
