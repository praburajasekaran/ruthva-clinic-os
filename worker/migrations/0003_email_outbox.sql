CREATE TABLE email_outbox (key TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK(json_valid(payload)), status TEXT NOT NULL CHECK(status IN ('pending','sending','sent')), attempts INTEGER NOT NULL DEFAULT 0, lease_until TEXT);
CREATE INDEX email_outbox_pending ON email_outbox(status,lease_until);
