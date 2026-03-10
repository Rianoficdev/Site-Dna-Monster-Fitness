DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'SupportTicketType'
  ) THEN
    CREATE TYPE "SupportTicketType" AS ENUM ('PASSWORD_RESET', 'GENERAL_SUPPORT');
  END IF;
END$$;

DO $$
DECLARE
  enum_value TEXT;
BEGIN
  FOREACH enum_value IN ARRAY ARRAY[
    'LOGIN_ISSUE',
    'APP_ERROR',
    'WORKOUT_ISSUE',
    'PROFILE_UPDATE',
    'PAYMENT_PLAN_ISSUE',
    'IMPROVEMENT_SUGGESTION',
    'EXERCISE_REPORT',
    'OTHER'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'SupportTicketType'
        AND e.enumlabel = enum_value
    ) THEN
      EXECUTE format('ALTER TYPE "SupportTicketType" ADD VALUE %L', enum_value);
    END IF;
  END LOOP;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'SupportTicketStatus'
  ) THEN
    CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'APPROVED', 'RESOLVED', 'REJECTED');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "support_ticket" (
  "id" SERIAL PRIMARY KEY,
  "requester_id" INTEGER NULL REFERENCES "User"("id") ON DELETE SET NULL,
  "requester_email" TEXT NOT NULL,
  "requester_name" TEXT NULL,
  "requester_role" TEXT NULL,
  "type" "SupportTicketType" NOT NULL DEFAULT 'GENERAL_SUPPORT',
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
  "admin_response" TEXT NULL,
  "metadata" JSONB NULL,
  "resolved_by_id" INTEGER NULL REFERENCES "User"("id") ON DELETE SET NULL,
  "resolved_at" TIMESTAMP(3) NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "support_ticket_requester_email_idx"
  ON "support_ticket" ("requester_email");

CREATE INDEX IF NOT EXISTS "support_ticket_requester_id_idx"
  ON "support_ticket" ("requester_id");

CREATE INDEX IF NOT EXISTS "support_ticket_status_type_idx"
  ON "support_ticket" ("status", "type");

CREATE INDEX IF NOT EXISTS "support_ticket_created_at_idx"
  ON "support_ticket" ("created_at");
