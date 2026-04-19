package com.klinebootcamp.dto.market;

import com.klinebootcamp.enums.AssetClass;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record InstrumentUpsertRequest(
        @NotBlank String symbol,
        @NotBlank String displayName,
        @NotNull AssetClass assetClass
) {
}
