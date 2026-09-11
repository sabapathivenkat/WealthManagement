-- Introduce YEARLY_EXPENSE as its own category kind (annual one-off costs, tracked separately
-- from monthly living expenses, e.g. insurance premiums, vehicle maintenance).
ALTER TABLE categories ALTER COLUMN kind TYPE VARCHAR(20);
ALTER TABLE categories DROP CONSTRAINT categories_kind_check;
ALTER TABLE categories ADD CONSTRAINT categories_kind_check
    CHECK (kind IN ('INCOME', 'EXPENSE', 'SAVINGS', 'DEBT', 'YEARLY_EXPENSE'));

-- Replace the generic starter category set with the user's own curated list. Existing
-- transactions/debts/savings/budgets that reference an old default keep working (categories are
-- never deleted, only archived), they just stop being offered for new entries.
UPDATE categories SET active = false
WHERE is_default = true AND (kind, name) IN (
    ('INCOME', 'Freelance'),
    ('INCOME', 'Investment Returns'),
    ('INCOME', 'Other Income'),
    ('EXPENSE', 'Food & Groceries'),
    ('EXPENSE', 'Utilities'),
    ('EXPENSE', 'Transportation'),
    ('EXPENSE', 'Healthcare'),
    ('EXPENSE', 'Entertainment'),
    ('EXPENSE', 'Shopping'),
    ('EXPENSE', 'EMI / Loan Payment'),
    ('EXPENSE', 'Insurance'),
    ('EXPENSE', 'Education'),
    ('EXPENSE', 'Other Expense'),
    ('SAVINGS', 'Bank Savings'),
    ('SAVINGS', 'Fixed Deposit'),
    ('SAVINGS', 'Mutual Funds'),
    ('SAVINGS', 'Stocks'),
    ('SAVINGS', 'PPF'),
    ('SAVINGS', 'EPF'),
    ('SAVINGS', 'Cash'),
    ('SAVINGS', 'Emergency Fund'),
    ('SAVINGS', 'Other Investments'),
    ('SAVINGS', 'Other Savings'),
    ('DEBT', 'Home Loan'),
    ('DEBT', 'Vehicle Loan'),
    ('DEBT', 'Credit Card'),
    ('DEBT', 'Borrowed Money'),
    ('DEBT', 'Interest-Free Debt'),
    ('DEBT', 'Other Debt')
);

INSERT INTO categories (user_id, name, kind, is_default, active) VALUES
    (NULL, 'Gold Loan', 'DEBT', true, true),
    (NULL, 'Amount Borrowed from Friends', 'DEBT', true, true),
    (NULL, 'Interest from Bonds', 'INCOME', true, true),
    (NULL, 'Others', 'INCOME', true, true),
    (NULL, 'EMI for PL', 'EXPENSE', true, true),
    (NULL, 'Grocery', 'EXPENSE', true, true),
    (NULL, 'EB', 'EXPENSE', true, true),
    (NULL, 'Water Bill', 'EXPENSE', true, true),
    (NULL, 'Subscriptions and Recharge', 'EXPENSE', true, true),
    (NULL, 'Travel', 'EXPENSE', true, true),
    (NULL, 'Credit Card Bill', 'EXPENSE', true, true),
    (NULL, 'Family', 'EXPENSE', true, true),
    (NULL, 'Personal Care', 'EXPENSE', true, true),
    (NULL, 'Outing', 'EXPENSE', true, true),
    (NULL, 'Vehicle Insurance', 'YEARLY_EXPENSE', true, true),
    (NULL, 'Medical Insurance', 'YEARLY_EXPENSE', true, true),
    (NULL, 'Term Insurance', 'YEARLY_EXPENSE', true, true),
    (NULL, 'Gold Loan Interest', 'YEARLY_EXPENSE', true, true),
    (NULL, 'Vehicle Maintenance', 'YEARLY_EXPENSE', true, true),
    (NULL, 'MF', 'SAVINGS', true, true),
    (NULL, 'Bond', 'SAVINGS', true, true),
    (NULL, 'Stock', 'SAVINGS', true, true);
