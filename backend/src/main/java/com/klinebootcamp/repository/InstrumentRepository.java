package com.klinebootcamp.repository;

import com.klinebootcamp.entity.Instrument;
import com.klinebootcamp.enums.AssetClass;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InstrumentRepository extends JpaRepository<Instrument, Long> {
    Optional<Instrument> findBySymbol(String symbol);
    List<Instrument> findByAssetClassAndActiveTrue(AssetClass assetClass);
    List<Instrument> findByActiveTrue();
}
