-- 1. Generalize transaction_categories into a shared categories table (income/expense/savings/debt)
ALTER TABLE transaction_categories RENAME TO categories;
ALTER TABLE categories RENAME COLUMN type TO kind;
ALTER TABLE categories DROP CONSTRAINT transaction_categories_type_check;
ALTER TABLE categories ADD CONSTRAINT categories_kind_check CHECK (kind IN ('INCOME', 'EXPENSE', 'SAVINGS', 'DEBT'));
ALTER TABLE categories ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;

INSERT INTO categories (user_id, name, kind, is_default) VALUES
    (NULL, 'Bank Savings', 'SAVINGS', true),
    (NULL, 'Fixed Deposit', 'SAVINGS', true),
    (NULL, 'Mutual Funds', 'SAVINGS', true),
    (NULL, 'Gold', 'SAVINGS', true),
    (NULL, 'Stocks', 'SAVINGS', true),
    (NULL, 'PPF', 'SAVINGS', true),
    (NULL, 'EPF', 'SAVINGS', true),
    (NULL, 'Cash', 'SAVINGS', true),
    (NULL, 'Emergency Fund', 'SAVINGS', true),
    (NULL, 'Other Investments', 'SAVINGS', true),
    (NULL, 'Other Savings', 'SAVINGS', true),
    (NULL, 'Personal Loan', 'DEBT', true),
    (NULL, 'Home Loan', 'DEBT', true),
    (NULL, 'Vehicle Loan', 'DEBT', true),
    (NULL, 'Credit Card', 'DEBT', true),
    (NULL, 'Borrowed Money', 'DEBT', true),
    (NULL, 'Interest-Free Debt', 'DEBT', true),
    (NULL, 'Other Debt', 'DEBT', true);

-- 2. Savings accounts (balance-tracked assets, distinct from goal targets)
CREATE TABLE savings_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category_id BIGINT NOT NULL REFERENCES categories(id),
    initial_value NUMERIC(15, 2) NOT NULL CHECK (initial_value >= 0),
    start_date DATE,
    notes VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- 3. Extend transactions into the universal ledger (income, expense, savings, debt movements)
ALTER TABLE transactions ALTER COLUMN category_id DROP NOT NULL;
ALTER TABLE transactions ADD COLUMN related_savings_account_id BIGINT REFERENCES savings_accounts(id) ON DELETE CASCADE;
ALTER TABLE transactions ADD COLUMN related_debt_id BIGINT REFERENCES debts(id) ON DELETE CASCADE;
ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN
    ('INCOME', 'EXPENSE', 'SAVINGS_CONTRIBUTION', 'SAVINGS_WITHDRAWAL', 'DEBT_PAYMENT', 'DEBT_ADJUSTMENT', 'ASSET_ADJUSTMENT'));
ALTER TABLE transactions DROP CONSTRAINT transactions_amount_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_amount_check CHECK (amount <> 0);
CREATE INDEX idx_transactions_savings_account ON transactions(related_savings_account_id);
CREATE INDEX idx_transactions_debt ON transactions(related_debt_id);

-- 4. Extend debts: rename principal -> original_amount, drop stored current_balance (now derived from
--    DEBT_PAYMENT/DEBT_ADJUSTMENT transactions), add classification and planning fields.
ALTER TABLE debts RENAME COLUMN principal TO original_amount;
ALTER TABLE debts DROP CONSTRAINT debts_current_balance_check;
ALTER TABLE debts DROP COLUMN current_balance;

ALTER TABLE debts ADD COLUMN debt_category_id BIGINT REFERENCES categories(id);
UPDATE debts SET debt_category_id = (SELECT id FROM categories WHERE kind = 'DEBT' AND name = 'Other Debt' LIMIT 1)
    WHERE debt_category_id IS NULL;
ALTER TABLE debts ALTER COLUMN debt_category_id SET NOT NULL;

ALTER TABLE debts DROP CONSTRAINT debts_interest_rate_check;
ALTER TABLE debts ALTER COLUMN interest_rate DROP NOT NULL;
ALTER TABLE debts ADD CONSTRAINT debts_interest_rate_check CHECK (interest_rate IS NULL OR interest_rate >= 0);

ALTER TABLE debts DROP CONSTRAINT debts_min_payment_check;
ALTER TABLE debts ALTER COLUMN min_payment DROP NOT NULL;
ALTER TABLE debts ADD CONSTRAINT debts_min_payment_check CHECK (min_payment IS NULL OR min_payment >= 0);

ALTER TABLE debts ADD COLUMN emi_amount NUMERIC(15, 2) CHECK (emi_amount IS NULL OR emi_amount >= 0);
ALTER TABLE debts ADD COLUMN remaining_months INTEGER CHECK (remaining_months IS NULL OR remaining_months >= 0);
ALTER TABLE debts ADD COLUMN expected_end_date DATE;
ALTER TABLE debts ADD COLUMN due_day INTEGER CHECK (due_day IS NULL OR (due_day BETWEEN 1 AND 31));
ALTER TABLE debts ADD COLUMN interest_bearing BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE debts ADD COLUMN priority INTEGER;
ALTER TABLE debts ADD COLUMN notes VARCHAR(500);
ALTER TABLE debts ADD COLUMN status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED'));
