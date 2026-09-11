CREATE TABLE user_settings (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    fy_start_month INTEGER NOT NULL DEFAULT 4 CHECK (fy_start_month BETWEEN 1 AND 12),
    default_debt_strategy VARCHAR(10) NOT NULL DEFAULT 'AVALANCHE' CHECK (default_debt_strategy IN ('AVALANCHE', 'SNOWBALL', 'CUSTOM'))
);
