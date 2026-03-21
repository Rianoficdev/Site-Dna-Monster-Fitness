#!/usr/bin/env node
"use strict";

const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

const SOURCE_DATABASE_URL = String(process.env.DATABASE_URL || "").trim();
const TARGET_DATABASE_URL = String(process.env.TARGET_DATABASE_URL || "").trim();
const MIGRATION_TABLES_TO_SKIP = new Set(["dna_sql_migration"]);

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function quoteQualifiedIdentifier(schemaName, tableName) {
  return `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`;
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

async function getPublicTables(client) {
  const result = await client.query(`
    select tablename
    from pg_tables
    where schemaname = 'public'
    order by tablename
  `);

  return result.rows
    .map((row) => String(row.tablename))
    .filter((tableName) => !MIGRATION_TABLES_TO_SKIP.has(tableName));
}

async function getTableDependencies(client) {
  const result = await client.query(`
    select
      tc.table_name as child_table,
      ccu.table_name as parent_table
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name
     and tc.constraint_schema = ccu.constraint_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_schema = 'public'
    order by tc.table_name, ccu.table_name
  `);

  return result.rows.map((row) => ({
    childTable: String(row.child_table),
    parentTable: String(row.parent_table),
  }));
}

function buildInsertionOrder(tableNames, dependencies) {
  const tableSet = new Set(tableNames);
  const indegree = new Map(tableNames.map((tableName) => [tableName, 0]));
  const edges = new Map(tableNames.map((tableName) => [tableName, new Set()]));

  dependencies.forEach(({ childTable, parentTable }) => {
    if (!tableSet.has(childTable) || !tableSet.has(parentTable) || childTable === parentTable) {
      return;
    }

    const nextChildren = edges.get(parentTable);
    if (!nextChildren || nextChildren.has(childTable)) return;
    nextChildren.add(childTable);
    indegree.set(childTable, (indegree.get(childTable) || 0) + 1);
  });

  const queue = tableNames.filter((tableName) => (indegree.get(tableName) || 0) === 0);
  queue.sort((a, b) => a.localeCompare(b));

  const ordered = [];

  while (queue.length) {
    const tableName = queue.shift();
    ordered.push(tableName);

    const children = Array.from(edges.get(tableName) || []).sort((a, b) => a.localeCompare(b));
    children.forEach((childTable) => {
      const nextIndegree = (indegree.get(childTable) || 0) - 1;
      indegree.set(childTable, nextIndegree);
      if (nextIndegree === 0) {
        queue.push(childTable);
        queue.sort((a, b) => a.localeCompare(b));
      }
    });
  }

  if (ordered.length === tableNames.length) {
    return ordered;
  }

  const remaining = tableNames.filter((tableName) => !ordered.includes(tableName)).sort((a, b) => a.localeCompare(b));
  return [...ordered, ...remaining];
}

async function getTableColumns(client, tableName) {
  const result = await client.query(
    `
      select column_name, data_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
      order by ordinal_position
    `,
    [tableName]
  );

  return result.rows.map((row) => ({
    name: String(row.column_name),
    dataType: String(row.data_type || "").toLowerCase(),
  }));
}

async function getTableRows(client, tableName, columns) {
  const columnSql = columns.map((column) => quoteIdentifier(column.name)).join(", ");
  const sql = `select ${columnSql} from ${quoteQualifiedIdentifier("public", tableName)}`;
  const result = await client.query(sql);
  return result.rows;
}

function normalizeColumnValue(column, value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (column.dataType === "json" || column.dataType === "jsonb") {
    return JSON.stringify(value);
  }
  return value;
}

async function truncateTargetTables(client, tableNames) {
  if (!tableNames.length) return;
  const tableSql = tableNames.map((tableName) => quoteQualifiedIdentifier("public", tableName)).join(", ");
  await client.query(`truncate table ${tableSql} restart identity cascade`);
}

async function copyTableRows(sourceClient, targetClient, tableName) {
  const columns = await getTableColumns(sourceClient, tableName);
  if (!columns.length) {
    return 0;
  }

  const rows = await getTableRows(sourceClient, tableName, columns);
  if (!rows.length) {
    return 0;
  }

  const columnSql = columns.map((column) => quoteIdentifier(column.name)).join(", ");

  for (const row of rows) {
    const values = columns.map((column) => normalizeColumnValue(column, row[column.name]));
    const placeholderSql = values.map((_, index) => `$${index + 1}`).join(", ");
    const sql = `insert into ${quoteQualifiedIdentifier("public", tableName)} (${columnSql}) values (${placeholderSql})`;
    await targetClient.query(sql, values);
  }

  return rows.length;
}

async function resetTableSequences(client, tableName) {
  const result = await client.query(
    `
      select
        a.attname as column_name,
        pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) as sequence_name
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid
      where n.nspname = 'public'
        and c.relname = $1
        and a.attnum > 0
        and not a.attisdropped
    `,
    [tableName]
  );

  for (const row of result.rows) {
    const sequenceName = String(row.sequence_name || "").trim();
    const columnName = String(row.column_name || "").trim();
    if (!sequenceName || !columnName) continue;

    const maxResult = await client.query(
      `select max(${quoteIdentifier(columnName)})::bigint as max_value from ${quoteQualifiedIdentifier("public", tableName)}`
    );

    const maxValue = maxResult.rows[0] && maxResult.rows[0].max_value !== null
      ? Number(maxResult.rows[0].max_value)
      : null;

    if (maxValue === null) {
      await client.query(`select setval($1, 1, false)`, [sequenceName]);
      continue;
    }

    await client.query(`select setval($1, $2, true)`, [sequenceName, maxValue]);
  }
}

async function getTableCounts(client, tableNames) {
  const counts = new Map();

  for (const tableName of tableNames) {
    const result = await client.query(`select count(*)::int as total from ${quoteQualifiedIdentifier("public", tableName)}`);
    counts.set(tableName, Number(result.rows[0].total || 0));
  }

  return counts;
}

async function main() {
  if (!SOURCE_DATABASE_URL) {
    throw new Error("DATABASE_URL nao definida no .env para a origem.");
  }

  if (!TARGET_DATABASE_URL) {
    throw new Error("TARGET_DATABASE_URL nao definida para o destino.");
  }

  if (SOURCE_DATABASE_URL === TARGET_DATABASE_URL) {
    throw new Error("Origem e destino apontam para a mesma DATABASE_URL.");
  }

  const sourceClient = await createClient(SOURCE_DATABASE_URL);
  const targetClient = await createClient(TARGET_DATABASE_URL);

  try {
    const tableNames = await getPublicTables(sourceClient);
    const dependencies = await getTableDependencies(sourceClient);
    const insertionOrder = buildInsertionOrder(tableNames, dependencies);

    await targetClient.query("begin");
    await truncateTargetTables(targetClient, insertionOrder);

    const copiedCounts = new Map();
    for (const tableName of insertionOrder) {
      const copiedRows = await copyTableRows(sourceClient, targetClient, tableName);
      copiedCounts.set(tableName, copiedRows);
    }

    for (const tableName of insertionOrder) {
      await resetTableSequences(targetClient, tableName);
    }

    await targetClient.query("commit");

    const [sourceCounts, targetCounts] = await Promise.all([
      getTableCounts(sourceClient, insertionOrder),
      getTableCounts(targetClient, insertionOrder),
    ]);

    console.log(`Tabelas copiadas: ${insertionOrder.length}`);
    insertionOrder.forEach((tableName) => {
      console.log(
        `${tableName}: source=${sourceCounts.get(tableName) || 0} target=${targetCounts.get(tableName) || 0} inserted=${copiedCounts.get(tableName) || 0}`
      );
    });
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
