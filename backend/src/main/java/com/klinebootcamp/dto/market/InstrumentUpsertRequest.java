package com.klinebootcamp.dto.market;

import com.klinebootcamp.enums.AssetClass;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

public class InstrumentUpsertRequest {
    @NotBlank
    private String symbol;
    @NotBlank
    private String displayName;
    @NotNull
    private AssetClass assetClass;

    public InstrumentUpsertRequest() {
    }

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public AssetClass getAssetClass() { return assetClass; }
    public void setAssetClass(AssetClass assetClass) { this.assetClass = assetClass; }
}
