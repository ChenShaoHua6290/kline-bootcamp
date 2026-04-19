package com.klinebootcamp.controller;

import com.klinebootcamp.dto.training.*;
import com.klinebootcamp.service.TrainingService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @GetMapping("/{sessionId}/panel")
    public TrainingPanelResponse panel(@PathVariable Long sessionId, Authentication authentication) {
        return trainingService.getPanel(sessionId, authentication.getName());
    }

    @PostMapping("/{sessionId}/action")
    public TrainingPanelResponse action(@PathVariable Long sessionId,
                                        @RequestBody TrainingActionRequest request,
                                        Authentication authentication) {
        return trainingService.performAction(sessionId, authentication.getName(), request);
    }

    @GetMapping("/history")
    public List<TrainingHistoryItem> history(Authentication authentication) {
        return trainingService.history(authentication.getName());
    }

    @PostMapping("/{sessionId}/reveal")
    public TrainingRevealResponse reveal(@PathVariable Long sessionId, Authentication authentication) {
        return trainingService.reveal(sessionId, authentication.getName());
    }
}
