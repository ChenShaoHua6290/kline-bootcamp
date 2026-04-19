CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(128) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS instruments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    symbol VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(128) NOT NULL,
    asset_class VARCHAR(16) NOT NULL,
    active BIT(1) NOT NULL
);

CREATE TABLE IF NOT EXISTS kline_candles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    instrument_id BIGINT NOT NULL,
    timeframe VARCHAR(8) NOT NULL,
    open_time DATETIME(6) NOT NULL,
    open DECIMAL(20,8) NOT NULL,
    high DECIMAL(20,8) NOT NULL,
    low DECIMAL(20,8) NOT NULL,
    close DECIMAL(20,8) NOT NULL,
    volume DECIMAL(20,8) NOT NULL,
    CONSTRAINT uk_candle_inst_tf_open UNIQUE (instrument_id, timeframe, open_time),
    CONSTRAINT fk_candle_instrument FOREIGN KEY (instrument_id) REFERENCES instruments(id)
);

CREATE TABLE IF NOT EXISTS training_sessions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    instrument_id BIGINT NOT NULL,
    timeframe VARCHAR(8) NOT NULL,
    context_size INT NOT NULL,
    target_size INT NOT NULL,
    start_offset BIGINT NOT NULL,
    current_step INT NOT NULL,
    initial_balance DECIMAL(20,4) NOT NULL,
    cash_balance DECIMAL(20,4) NOT NULL,
    position_qty DECIMAL(20,8) NOT NULL,
    avg_price DECIMAL(20,8) NOT NULL,
    realized_pnl DECIMAL(20,4) NOT NULL,
    finished BIT(1) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_session_instrument FOREIGN KEY (instrument_id) REFERENCES instruments(id)
);

CREATE TABLE IF NOT EXISTS training_trades (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id BIGINT NOT NULL,
    action VARCHAR(16) NOT NULL,
    quantity DECIMAL(20,8) NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_trade_session FOREIGN KEY (session_id) REFERENCES training_sessions(id)
);
