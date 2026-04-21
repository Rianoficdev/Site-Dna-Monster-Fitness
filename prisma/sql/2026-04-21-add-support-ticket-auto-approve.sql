ALTER TABLE "support_ticket"
  ADD COLUMN IF NOT EXISTS "auto_approve_at" TIMESTAMP(3) NULL;

ALTER TABLE "support_ticket"
  ADD COLUMN IF NOT EXISTS "auto_approved" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS "support_ticket_auto_approve_at_idx"
  ON "support_ticket" ("auto_approve_at");
