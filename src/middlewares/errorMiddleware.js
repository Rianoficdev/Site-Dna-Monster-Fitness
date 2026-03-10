const { Prisma } = require("@prisma/client");
const { AppError } = require("../utils/AppError");
const logger = require("../shared/logger");

function isDatabaseConnectivityError(error) {
  const code = String((error && (error.code || error.errorCode || error.errno)) || "")
    .trim()
    .toUpperCase();
  if (
    [
      "P1001",
      "P1002",
      "P1008",
      "P1017",
      "ETIMEDOUT",
      "ECONNREFUSED",
      "EHOSTUNREACH",
      "ENETUNREACH",
      "ENOTFOUND",
      "EACCES",
    ].includes(code)
  ) {
    return true;
  }

  const message = String((error && error.message) || "")
    .trim()
    .toLowerCase();
  return (
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("can't reach database") ||
    message.includes("can not reach database") ||
    message.includes("p1001") ||
    message.includes("p1002") ||
    message.includes("p1008")
  );
}

function isDatabaseSchemaMissingError(error) {
  const code = String((error && error.code) || "")
    .trim()
    .toUpperCase();
  if (code === "P2021" || code === "P2022") return true;

  const message = String((error && error.message) || "")
    .trim()
    .toLowerCase();
  return (
    (message.includes("table") && message.includes("does not exist")) ||
    (message.includes("relation") && message.includes("does not exist")) ||
    (message.includes("column") && message.includes("does not exist")) ||
    (message.includes("type") && message.includes("does not exist"))
  );
}

function isDatabasePermissionError(error) {
  const code = String((error && (error.code || error.errorCode || error.errno)) || "")
    .trim()
    .toUpperCase();
  if (code === "42501" || code === "EACCES") return true;

  const message = String((error && error.message) || "")
    .trim()
    .toLowerCase();
  return (
    message.includes("permission denied") ||
    message.includes("insufficient privilege") ||
    message.includes("access denied") ||
    message.includes("not authorized")
  );
}

function errorMiddleware(error, _req, res, _next) {
  const isInvalidJsonBodyError =
    Boolean(error) &&
    error instanceof SyntaxError &&
    Object.prototype.hasOwnProperty.call(error, "status") &&
    Number(error.status) === 400 &&
    Boolean(error.body);

  if (isInvalidJsonBodyError) {
    return res.status(400).json({
      error: {
        code: "INVALID_JSON_BODY",
        message: "JSON invalido no corpo da requisicao.",
      },
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(409).json({
        error: {
          code: "DUPLICATE_RECORD",
          message: "Registro duplicado.",
        },
      });
    }

    if (isDatabaseSchemaMissingError(error)) {
      return res.status(503).json({
        error: {
          code: "DATABASE_SCHEMA_OUTDATED",
          message:
            "Estrutura do banco desatualizada. Aplique os scripts SQL pendentes em prisma/sql e reinicie a API.",
        },
      });
    }

    if (isDatabasePermissionError(error)) {
      return res.status(503).json({
        error: {
          code: "DATABASE_ACCESS_DENIED",
          message: "A API nao possui permissao suficiente no banco de dados para esta operacao.",
        },
      });
    }

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({
        error: {
          code: "DATABASE_UNAVAILABLE",
          message:
            "Banco de dados indisponivel no momento. Verifique a conexao e tente novamente.",
        },
      });
    }

    if (error.code === "P2010") {
      return res.status(503).json({
        error: {
          code: "DATABASE_ERROR",
          message: "Erro de banco ao executar consulta SQL da API.",
        },
      });
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Dados invalidos na requisicao.",
      },
    });
  }

  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    const code = isDatabaseConnectivityError(error)
      ? "DATABASE_UNAVAILABLE"
      : isDatabasePermissionError(error)
        ? "DATABASE_ACCESS_DENIED"
        : "DATABASE_ERROR";
    return res.status(503).json({
      error: {
        code,
        message:
          code === "DATABASE_UNAVAILABLE"
            ? "Banco de dados indisponivel no momento. Verifique a conexao e tente novamente."
            : code === "DATABASE_ACCESS_DENIED"
              ? "A API nao possui permissao suficiente no banco de dados para esta operacao."
              : "Erro na camada de banco de dados. Verifique configuracao e conexao.",
      },
    });
  }

  logger.error("Unhandled error", {
    name: error?.name,
    message: error?.message,
  });

  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Erro interno no servidor.",
    },
  });
}

module.exports = {
  errorMiddleware,
};
