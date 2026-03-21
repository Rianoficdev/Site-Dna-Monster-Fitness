#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

const SOURCE_DATABASE_URL = String(process.env.DATABASE_URL || "").trim();
const SOURCE_SUPABASE_URL = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const TARGET_DATABASE_URL = String(process.env.TARGET_DATABASE_URL || "").trim();
const TARGET_SUPABASE_URL = String(process.env.TARGET_SUPABASE_URL || "").trim().replace(/\/+$/, "");
const TARGET_SUPABASE_SERVICE_ROLE_KEY = String(process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY || "").trim();
const STORAGE_BUCKET = String(process.env.SUPABASE_STORAGE_BUCKET || "media").trim();
const STORE_FILE_PATH = path.resolve(process.cwd(), "data", "in-memory-store.json");
const DEFAULT_CONCURRENCY = 4;

function quoteIdentifier(value) {
  return `"${String(value || "").replace(/"/g, '""')}"`;
}

function quoteQualifiedIdentifier(schemaName, tableName) {
  return `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`;
}

function normalizeObjectPath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/")
    .trim();
}

function encodeStoragePathSegments(objectPath) {
  return normalizeObjectPath(objectPath)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function getConcurrency() {
  const rawValue = Number(process.env.STORAGE_MIGRATION_CONCURRENCY || DEFAULT_CONCURRENCY);
  if (!Number.isFinite(rawValue) || rawValue < 1) return DEFAULT_CONCURRENCY;
  return Math.min(8, Math.trunc(rawValue));
}

async function createClient(connectionString) {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });
  await client.connect();
  return client;
}

async function getSourceObjects(client) {
  const result = await client.query(
    `
      select name, metadata
      from storage.objects
      where bucket_id = $1
      order by name asc
    `,
    [STORAGE_BUCKET]
  );

  return result.rows.map((row) => ({
    name: String(row.name || ""),
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
  }));
}

function buildSourcePublicUrl(objectPath) {
  return `${SOURCE_SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(STORAGE_BUCKET)}/${encodeStoragePathSegments(objectPath)}`;
}

function buildTargetUploadUrl(objectPath) {
  return `${TARGET_SUPABASE_URL}/storage/v1/object/${encodeURIComponent(STORAGE_BUCKET)}/${encodeStoragePathSegments(objectPath)}`;
}

async function uploadObjectToTarget(objectPath, fileBuffer, metadata) {
  const mimeType = String(
    (metadata && (metadata.mimetype || metadata.contentType)) || "application/octet-stream"
  ).trim();

  const response = await fetch(buildTargetUploadUrl(objectPath), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TARGET_SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: TARGET_SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": mimeType,
      "x-upsert": "true",
    },
    body: fileBuffer,
  });

  if (response.ok) return;

  const errorText = await response.text().catch(() => "");
  throw new Error(
    `Falha ao enviar ${objectPath} para o destino (${response.status}). ${errorText}`.trim()
  );
}

async function copySingleObject(objectItem) {
  const sourceResponse = await fetch(buildSourcePublicUrl(objectItem.name));
  if (!sourceResponse.ok) {
    const errorText = await sourceResponse.text().catch(() => "");
    throw new Error(
      `Falha ao baixar ${objectItem.name} da origem (${sourceResponse.status}). ${errorText}`.trim()
    );
  }

  const arrayBuffer = await sourceResponse.arrayBuffer();
  await uploadObjectToTarget(objectItem.name, Buffer.from(arrayBuffer), objectItem.metadata);
}

async function copyObjectsWithConcurrency(objectItems) {
  const total = objectItems.length;
  const concurrency = getConcurrency();
  let nextIndex = 0;
  let completed = 0;
  const failures = [];

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= total) return;

      const objectItem = objectItems[currentIndex];
      try {
        await copySingleObject(objectItem);
        completed += 1;
        if (completed % 25 === 0 || completed === total) {
          console.log(`Storage copiado: ${completed}/${total}`);
        }
      } catch (error) {
        failures.push({
          name: objectItem.name,
          message: error && error.message ? error.message : String(error),
        });
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
  await Promise.all(workers);

  if (failures.length) {
    const summary = failures
      .slice(0, 10)
      .map((item) => `${item.name}: ${item.message}`)
      .join(" | ");
    throw new Error(
      `Falha ao copiar ${failures.length} objeto(s) do storage. ${summary}`.trim()
    );
  }
}

async function getObjectCountByBucket(client) {
  const result = await client.query(
    `
      select count(*)::int as total
      from storage.objects
      where bucket_id = $1
    `,
    [STORAGE_BUCKET]
  );

  return Number(result.rows[0] && result.rows[0].total ? result.rows[0].total : 0);
}

async function retargetPublicSchemaUrls(client) {
  const oldBaseUrl = SOURCE_SUPABASE_URL;
  const newBaseUrl = TARGET_SUPABASE_URL;
  const oldLikePattern = `%${oldBaseUrl}%`;

  const columnsResult = await client.query(`
    select table_name, column_name, data_type
    from information_schema.columns
    where table_schema = 'public'
      and data_type in ('text', 'character varying', 'character', 'json', 'jsonb')
    order by table_name, ordinal_position
  `);

  const columnsByTable = new Map();
  columnsResult.rows.forEach((row) => {
    const tableName = String(row.table_name || "");
    const items = columnsByTable.get(tableName) || [];
    items.push({
      columnName: String(row.column_name || ""),
      dataType: String(row.data_type || "").toLowerCase(),
    });
    columnsByTable.set(tableName, items);
  });

  const updateSummary = [];

  for (const [tableName, columns] of columnsByTable.entries()) {
    const setClauses = [];
    const whereClauses = [];

    columns.forEach((column) => {
      const columnSql = quoteIdentifier(column.columnName);
      if (column.dataType === "jsonb") {
        setClauses.push(
          `${columnSql} = case when ${columnSql} is null then null else replace(${columnSql}::text, $1, $2)::jsonb end`
        );
        whereClauses.push(`${columnSql}::text like $3`);
        return;
      }

      if (column.dataType === "json") {
        setClauses.push(
          `${columnSql} = case when ${columnSql} is null then null else replace(${columnSql}::text, $1, $2)::json end`
        );
        whereClauses.push(`${columnSql}::text like $3`);
        return;
      }

      setClauses.push(`${columnSql} = replace(${columnSql}, $1, $2)`);
      whereClauses.push(`${columnSql} like $3`);
    });

    if (!setClauses.length || !whereClauses.length) continue;

    const sql = `
      update ${quoteQualifiedIdentifier("public", tableName)}
      set ${setClauses.join(", ")}
      where ${whereClauses.join(" or ")}
    `;

    const result = await client.query(sql, [oldBaseUrl, newBaseUrl, oldLikePattern]);
    updateSummary.push({
      tableName,
      rowsAffected: Number(result.rowCount || 0),
    });
  }

  return updateSummary;
}

function replaceStringValues(value, fromValue, toValue) {
  if (Array.isArray(value)) {
    let changed = false;
    const nextValue = value.map((item) => {
      const nextItem = replaceStringValues(item, fromValue, toValue);
      if (nextItem !== item) changed = true;
      return nextItem;
    });
    return changed ? nextValue : value;
  }

  if (!value || typeof value !== "object") {
    if (typeof value !== "string") return value;
    return value.includes(fromValue) ? value.replaceAll(fromValue, toValue) : value;
  }

  let changed = false;
  const nextObject = {};
  Object.entries(value).forEach(([key, item]) => {
    const nextItem = replaceStringValues(item, fromValue, toValue);
    if (nextItem !== item) changed = true;
    nextObject[key] = nextItem;
  });

  return changed ? nextObject : value;
}

function updateLocalStoreUrls() {
  if (!fs.existsSync(STORE_FILE_PATH)) {
    return false;
  }

  const currentStore = JSON.parse(fs.readFileSync(STORE_FILE_PATH, "utf8"));
  const nextStore = replaceStringValues(currentStore, SOURCE_SUPABASE_URL, TARGET_SUPABASE_URL);
  if (nextStore === currentStore) {
    return false;
  }

  fs.writeFileSync(STORE_FILE_PATH, `${JSON.stringify(nextStore, null, 2)}\n`, "utf8");
  return true;
}

async function main() {
  if (!SOURCE_DATABASE_URL) {
    throw new Error("DATABASE_URL da origem nao configurada.");
  }
  if (!SOURCE_SUPABASE_URL) {
    throw new Error("SUPABASE_URL da origem nao configurada.");
  }
  if (!TARGET_DATABASE_URL) {
    throw new Error("TARGET_DATABASE_URL nao configurada.");
  }
  if (!TARGET_SUPABASE_URL) {
    throw new Error("TARGET_SUPABASE_URL nao configurada.");
  }
  if (!TARGET_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("TARGET_SUPABASE_SERVICE_ROLE_KEY nao configurada.");
  }

  const sourceClient = await createClient(SOURCE_DATABASE_URL);
  const targetClient = await createClient(TARGET_DATABASE_URL);

  try {
    const objectItems = await getSourceObjects(sourceClient);
    if (!objectItems.length) {
      console.log(`Nenhum objeto encontrado no bucket ${STORAGE_BUCKET}.`);
      return;
    }

    const sourceCount = objectItems.length;
    console.log(`Objetos encontrados na origem: ${sourceCount}`);
    await copyObjectsWithConcurrency(objectItems);

    const targetCount = await getObjectCountByBucket(targetClient);
    console.log(`Objetos encontrados no destino apos copia: ${targetCount}`);
    if (targetCount < sourceCount) {
      throw new Error(
        `Contagem do destino menor que a origem para o bucket ${STORAGE_BUCKET}: origem=${sourceCount} destino=${targetCount}`
      );
    }

    await targetClient.query("begin");
    const updateSummary = await retargetPublicSchemaUrls(targetClient);
    await targetClient.query("commit");

    const updatedStore = updateLocalStoreUrls();

    updateSummary.forEach((item) => {
      if (!item.rowsAffected) return;
      console.log(`URLs atualizadas em ${item.tableName}: ${item.rowsAffected}`);
    });
    console.log(`Store local atualizado: ${updatedStore ? "sim" : "nao"}`);
  } catch (error) {
    await targetClient.query("rollback").catch(() => {});
    throw error;
  } finally {
    await Promise.allSettled([sourceClient.end(), targetClient.end()]);
  }
}

main().catch((error) => {
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
});
