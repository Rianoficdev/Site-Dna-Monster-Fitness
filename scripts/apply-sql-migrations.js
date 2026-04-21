#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const dotenv = require("dotenv");
const { Client } = require("pg");

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

function hashContent(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function formatErrorDetails(error) {
  if (!error) return "erro desconhecido";
  const lines = [];
  const message = error && error.message ? String(error.message) : String(error);
  lines.push(message);

  if (error.code) {
    lines.push(`code=${error.code}`);
  }
  if (error.address) {
    lines.push(`address=${error.address}`);
  }
  if (error.port) {
    lines.push(`port=${error.port}`);
  }

  if (Array.isArray(error.errors) && error.errors.length) {
    const nested = error.errors
      .map((item) => {
        if (!item) return "desconhecido";
        const parts = [];
        if (item.message) parts.push(item.message);
        if (item.code) parts.push(`code=${item.code}`);
        if (item.address) parts.push(`address=${item.address}`);
        if (item.port) parts.push(`port=${item.port}`);
        return parts.join(" | ");
      })
      .filter(Boolean);

    if (nested.length) {
      lines.push(`nested=[${nested.join(" || ")}]`);
    }
  }

  return lines.join(" | ");
}

function shouldUseRelaxedSsl(databaseUrl) {
  const normalized = String(databaseUrl || "").toLowerCase();
  return normalized.includes("supabase.com") || normalized.includes("supabase.co") || normalized.includes("sslmode=");
}

function normalizeDatabaseUrl(databaseUrl) {
  const trimmed = String(databaseUrl || "").trim();
  if (!trimmed) return "";

  const wrappedWithDoubleQuotes = trimmed.startsWith('"') && trimmed.endsWith('"');
  const wrappedWithSingleQuotes = trimmed.startsWith("'") && trimmed.endsWith("'");

  if (wrappedWithDoubleQuotes || wrappedWithSingleQuotes) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function removeQueryParam(databaseUrl, paramName) {
  const safeParamName = String(paramName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!safeParamName) return String(databaseUrl || "");

  return String(databaseUrl || "")
    .replace(new RegExp(`([?&])${safeParamName}=[^&]*(&)?`, "i"), (_match, prefix, hasTrailing) => {
      if (prefix === "?") return hasTrailing ? "?" : "";
      return hasTrailing ? "&" : "";
    })
    .replace(/[?&]$/, "");
}

function buildClientConfig(databaseUrl) {
  const normalizedDatabaseUrl = normalizeDatabaseUrl(databaseUrl);
  if (!shouldUseRelaxedSsl(normalizedDatabaseUrl)) {
    return {
      connectionString: normalizedDatabaseUrl,
    };
  }

  // When the URL already contains sslmode=require, pg may prioritize that over the
  // explicit ssl object below and reject self-signed chains. Strip the URL flags and
  // keep the relaxed TLS behavior in one place.
  const sanitizedConnectionString = [ "sslmode", "uselibpqcompat" ].reduce(
    (currentValue, paramName) => removeQueryParam(currentValue, paramName),
    normalizedDatabaseUrl
  );

  return {
    connectionString: sanitizedConnectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  };
}

async function main() {
  const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!databaseUrl) {
    throw new Error("DATABASE_URL nao definida. Configure .env antes de aplicar migracoes SQL.");
  }

  const migrationsDir = path.resolve(process.cwd(), "prisma", "sql");
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Diretorio de migracoes nao encontrado: ${migrationsDir}`);
  }

  const files = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  if (!files.length) {
    console.log("[db:migrate:sql] nenhum arquivo SQL encontrado em prisma/sql");
    return;
  }

  const client = new Client(buildClientConfig(databaseUrl));

  await client.connect();

  try {
    await client.query(`
CREATE TABLE IF NOT EXISTS dna_sql_migration (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
    `);

    const appliedResult = await client.query(
      "SELECT file_name, checksum FROM dna_sql_migration ORDER BY file_name ASC"
    );
    const appliedByFile = new Map(
      (appliedResult.rows || []).map((row) => [String(row.file_name), String(row.checksum || "")])
    );

    let appliedCount = 0;
    let skippedCount = 0;

    for (const fileName of files) {
      const filePath = path.join(migrationsDir, fileName);
      const sql = fs.readFileSync(filePath, "utf8");
      const checksum = hashContent(sql);
      const previousChecksum = appliedByFile.get(fileName);

      if (previousChecksum) {
        if (previousChecksum !== checksum) {
          throw new Error(
            `checksum divergente para ${fileName}. Arquivo SQL alterado apos execucao inicial.`
          );
        }
        skippedCount += 1;
        console.log(`[db:migrate:sql] skip ${fileName} (ja aplicado)`);
        continue;
      }

      console.log(`[db:migrate:sql] apply ${fileName}`);
      await client.query(sql);
      await client.query(
        "INSERT INTO dna_sql_migration (file_name, checksum) VALUES ($1, $2)",
        [fileName, checksum]
      );
      appliedCount += 1;
    }

    console.log(
      `[db:migrate:sql] concluido | aplicados: ${appliedCount} | ja aplicados: ${skippedCount}`
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  const message = formatErrorDetails(error);
  console.error(`[db:migrate:sql][fail] ${message}`);
  process.exit(1);
});
