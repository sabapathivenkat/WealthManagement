CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE transaction_categories (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    is_default BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES transaction_categories(id),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    txn_date DATE NOT NULL,
    note VARCHAR(500),
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, txn_date);

CREATE TABLE budgets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES transaction_categories(id),
    period VARCHAR(10) NOT NULL CHECK (period IN ('MONTH', 'YEAR')),
    period_value VARCHAR(7) NOT NULL,
    planned_amount NUMERIC(15, 2) NOT NULL CHECK (planned_amount >= 0),
    UNIQUE (user_id, category_id, period, period_value)
);

CREATE TABLE debts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    principal NUMERIC(15, 2) NOT NULL CHECK (principal > 0),
    current_balance NUMERIC(15, 2) NOT NULL CHECK (current_balance >= 0),
    interest_rate NUMERIC(5, 2) NOT NULL CHECK (interest_rate >= 0),
    min_payment NUMERIC(15, 2) NOT NULL CHECK (min_payment >= 0),
    start_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE goals (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
    target_date DATE NOT NULL,
    current_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

INSERT INTO transaction_categories (user_id, name, type, is_default) VALUES
    (NULL, 'Salary', 'INCOME', true),
    (NULL, 'Freelance', 'INCOME', true),
    (NULL, 'Investment Returns', 'INCOME', true),
    (NULL, 'Other Income', 'INCOME', true),
    (NULL, 'Food & Groceries', 'EXPENSE', true),
    (NULL, 'Rent', 'EXPENSE', true),
    (NULL, 'Utilities', 'EXPENSE', true),
    (NULL, 'Transportation', 'EXPENSE', true),
    (NULL, 'Healthcare', 'EXPENSE', true),
    (NULL, 'Entertainment', 'EXPENSE', true),
    (NULL, 'Shopping', 'EXPENSE', true),
    (NULL, 'EMI / Loan Payment', 'EXPENSE', true),
    (NULL, 'Insurance', 'EXPENSE', true),
    (NULL, 'Education', 'EXPENSE', true),
    (NULL, 'Other Expense', 'EXPENSE', true);
