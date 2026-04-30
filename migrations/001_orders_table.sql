CREATE TABLE orders (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id        TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  amount_total             INTEGER,
  currency                 TEXT NOT NULL DEFAULT 'usd',
  status                   TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'expired', 'refunded', 'failed')),
  metadata                 JSONB DEFAULT '{}',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_orders" ON orders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "service_write_orders" ON orders
  FOR ALL
  USING (auth.role() = 'service_role');
