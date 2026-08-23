-- Presence of a row for an order means "this order chose manual bank
-- transfer" — replaces the old orders.payment_method column. proof_key
-- starts NULL (chosen at checkout, before the customer has uploaded
-- anything) and is filled in by the upload step.
CREATE TABLE IF NOT EXISTS payments_bank_transfer_proofs (
  order_id INTEGER PRIMARY KEY REFERENCES orders(id),
  proof_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
