-- Security hardening for payment-proof uploads and replayable checkout.
ALTER TABLE payments_bank_transfer_proofs ADD COLUMN upload_state TEXT NOT NULL DEFAULT 'empty';
-- SQLite only permits a constant default when adding a NOT NULL column to a
-- table that already has rows. Backfill the real creation timestamp below.
ALTER TABLE payments_bank_transfer_proofs ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01 00:00:00';

UPDATE payments_bank_transfer_proofs
SET upload_state = 'ready', updated_at = created_at
WHERE proof_key IS NOT NULL;

UPDATE payments_bank_transfer_proofs
SET updated_at = created_at
WHERE updated_at = '1970-01-01 00:00:00';

CREATE INDEX IF NOT EXISTS payments_proof_upload_state_index
  ON payments_bank_transfer_proofs(upload_state, updated_at);

ALTER TABLE orders ADD COLUMN idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_user_idempotency_key_index
  ON orders(user_id, idempotency_key)
  WHERE user_id IS NOT NULL AND idempotency_key IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS orders_pending_limit
BEFORE INSERT ON orders
WHEN NEW.status = 'pending'
  AND NEW.user_id IS NOT NULL
  AND (SELECT COUNT(*) FROM orders WHERE user_id = NEW.user_id AND status = 'pending') >= 5
BEGIN
  SELECT RAISE(ABORT, 'active_pending_order_limit');
END;
