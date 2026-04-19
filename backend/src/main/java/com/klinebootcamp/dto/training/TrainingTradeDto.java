package com.klinebootcamp.dto.training;

import com.klinebootcamp.enums.TradeActionType;

import java.math.BigDecimal;

public class TrainingTradeDto {
    private TradeActionType action;
    private BigDecimal quantity;
    private BigDecimal price;

    public TrainingTradeDto() {
    }

    public TrainingTradeDto(TradeActionType action, BigDecimal quantity, BigDecimal price) {
        this.action = action;
        this.quantity = quantity;
        this.price = price;
    }

    public TradeActionType getAction() { return action; }
    public void setAction(TradeActionType action) { this.action = action; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
}
