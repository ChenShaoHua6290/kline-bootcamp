package com.klinebootcamp.dto.training;

import com.klinebootcamp.enums.TradeActionType;

import java.math.BigDecimal;

public class TrainingActionRequest {
    private TradeActionType action;
    private BigDecimal quantity;

    public TrainingActionRequest() {
    }

    public TradeActionType getAction() { return action; }
    public void setAction(TradeActionType action) { this.action = action; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
}
