package com.klinebootcamp.dto.training;

import com.klinebootcamp.enums.AssetClass;
import com.klinebootcamp.enums.Timeframe;

public class CreateTrainingRequest {
    private AssetClass assetClass;
    private String symbol;
    private Timeframe timeframe;
    private Integer contextSize;
    private Integer targetSize;

    public CreateTrainingRequest() {
    }

    public AssetClass getAssetClass() { return assetClass; }
    public void setAssetClass(AssetClass assetClass) { this.assetClass = assetClass; }
    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }
    public Timeframe getTimeframe() { return timeframe; }
    public void setTimeframe(Timeframe timeframe) { this.timeframe = timeframe; }
    public Integer getContextSize() { return contextSize; }
    public void setContextSize(Integer contextSize) { this.contextSize = contextSize; }
    public Integer getTargetSize() { return targetSize; }
    public void setTargetSize(Integer targetSize) { this.targetSize = targetSize; }
}
