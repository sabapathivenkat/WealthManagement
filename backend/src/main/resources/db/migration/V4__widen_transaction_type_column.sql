-- V2 added longer TransactionType values (SAVINGS_CONTRIBUTION, SAVINGS_WITHDRAWAL, DEBT_ADJUSTMENT,
-- ASSET_ADJUSTMENT) but the column was still sized for the original short INCOME/EXPENSE values.
ALTER TABLE transactions ALTER COLUMN type TYPE VARCHAR(30);
