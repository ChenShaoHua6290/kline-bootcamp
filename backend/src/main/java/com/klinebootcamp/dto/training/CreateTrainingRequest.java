package com.klinebootcamp.dto.training;

import com.klinebootcamp.enums.AssetClass;
import com.klinebootcamp.enums.Timeframe;

public record CreateTrainingRequest(
        AssetClass assetClass,
        String symbol,
        Timeframe timeframe,
        Integer contextSize,
        Integer targetSize
) {
}
