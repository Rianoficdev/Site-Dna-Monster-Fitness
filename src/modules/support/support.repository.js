function createSupportRepository({ prisma }) {
  let ensureSchemaPromise = null;

  function normalizeId(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.trunc(parsed);
  }

  function isSupportSchemaMissingError(error) {
    const code = String((error && error.code) || "")
      .trim()
      .toUpperCase();
    if (code === "P2021" || code === "P2022") return true;

    const message = String((error && error.message) || "")
      .trim()
      .toLowerCase();

    return (
      message.includes("support_ticket") &&
      (message.includes("does not exist") ||
        message.includes("relation") ||
        message.includes("table"))
    );
  }

  function ensureSupportModelAvailable() {
    if (!prisma || !prisma.supportTicket) {
      throw new Error("Support database unavailable");
    }
  }

  async function ensureSupportTicketSchema() {
    ensureSupportModelAvailable();
    if (ensureSchemaPromise) return ensureSchemaPromise;

    ensureSchemaPromise = (async () => {
      await prisma.$executeRawUnsafe(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'SupportTicketType'
  ) THEN
    CREATE TYPE "SupportTicketType" AS ENUM ('PASSWORD_RESET', 'GENERAL_SUPPORT');
  END IF;
END$$;
      `);

      await prisma.$executeRawUnsafe(`
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
      `);

      await prisma.$executeRawUnsafe(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'SupportTicketStatus'
  ) THEN
    CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'APPROVED', 'RESOLVED', 'REJECTED');
  END IF;
END$$;
      `);

      await prisma.$executeRawUnsafe(`
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
      `);

      await prisma.$executeRawUnsafe(`
CREATE INDEX IF NOT EXISTS "support_ticket_requester_email_idx"
  ON "support_ticket" ("requester_email");
      `);

      await prisma.$executeRawUnsafe(`
CREATE INDEX IF NOT EXISTS "support_ticket_requester_id_idx"
  ON "support_ticket" ("requester_id");
      `);

      await prisma.$executeRawUnsafe(`
CREATE INDEX IF NOT EXISTS "support_ticket_status_type_idx"
  ON "support_ticket" ("status", "type");
      `);

      await prisma.$executeRawUnsafe(`
CREATE INDEX IF NOT EXISTS "support_ticket_created_at_idx"
  ON "support_ticket" ("created_at");
      `);
    })()
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        ensureSchemaPromise = null;
      });

    return ensureSchemaPromise;
  }

  async function runWithSupportSchemaRetry(executor) {
    ensureSupportModelAvailable();
    try {
      return await executor();
    } catch (error) {
      if (!isSupportSchemaMissingError(error)) throw error;
      await ensureSupportTicketSchema();
      return executor();
    }
  }

  const ticketSelect = {
    id: true,
    requesterId: true,
    requesterEmail: true,
    requesterName: true,
    requesterRole: true,
    type: true,
    subject: true,
    description: true,
    status: true,
    adminResponse: true,
    metadata: true,
    resolvedById: true,
    resolvedAt: true,
    createdAt: true,
    updatedAt: true,
  };

  async function createTicket(data) {
    return runWithSupportSchemaRetry(() =>
      prisma.supportTicket.create({
        data,
        select: ticketSelect,
      })
    );
  }

  async function findTicketById(ticketId) {
    const normalizedTicketId = normalizeId(ticketId);
    if (!normalizedTicketId) return null;

    return runWithSupportSchemaRetry(() =>
      prisma.supportTicket.findUnique({
        where: {
          id: normalizedTicketId,
        },
        select: ticketSelect,
      })
    );
  }

  async function updateTicketById({ ticketId, data }) {
    const normalizedTicketId = normalizeId(ticketId);
    if (!normalizedTicketId) return null;

    return runWithSupportSchemaRetry(() =>
      prisma.supportTicket.update({
        where: {
          id: normalizedTicketId,
        },
        data,
        select: ticketSelect,
      })
    );
  }

  async function listTicketsByRequester({ requesterId, requesterEmail, limit = 100 }) {
    const normalizedRequesterId = normalizeId(requesterId);
    const normalizedRequesterEmail = String(requesterEmail || "").trim().toLowerCase();
    const where = {};

    if (normalizedRequesterId) {
      where.requesterId = normalizedRequesterId;
    } else if (normalizedRequesterEmail) {
      where.requesterEmail = normalizedRequesterEmail;
    } else {
      return [];
    }

    return runWithSupportSchemaRetry(() =>
      prisma.supportTicket.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        take: Math.max(1, Number(limit) || 100),
        select: ticketSelect,
      })
    );
  }

  async function listAllTickets({ status, type, limit = 300 } = {}) {
    const normalizedStatus = String(status || "").trim().toUpperCase();
    const normalizedType = String(type || "").trim().toUpperCase();
    const where = {};

    if (normalizedStatus) {
      where.status = normalizedStatus;
    }

    if (normalizedType) {
      where.type = normalizedType;
    }

    return runWithSupportSchemaRetry(() =>
      prisma.supportTicket.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        take: Math.max(1, Number(limit) || 300),
        select: ticketSelect,
      })
    );
  }

  return {
    createTicket,
    findTicketById,
    updateTicketById,
    listTicketsByRequester,
    listAllTickets,
  };
}

module.exports = {
  createSupportRepository,
};
