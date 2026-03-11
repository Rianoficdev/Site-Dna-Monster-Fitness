const { Client } = require("pg");
const { env } = require("../src/config/env");

function normalizeIdentifier(value, fallback) {
  const normalized = String(value || fallback || "").trim();
  if (!normalized) return fallback;
  return normalized;
}

function quoteLiteral(value) {
  return `'${String(value || "").replace(/'/g, "''")}'`;
}

async function ensureBucketAndPolicies() {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL nao esta configurada.");
  }

  const bucketId = normalizeIdentifier(process.env.SUPABASE_STORAGE_BUCKET || "media", "media");
  const client = new Client({
    connectionString: env.databaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
insert into storage.buckets (id, name, public)
values ($1, $1, true)
on conflict (id)
do update set public = excluded.public, name = excluded.name
      `,
      [bucketId]
    );

    const safeBucketLiteral = quoteLiteral(bucketId);
    const policyDefinitions = [
      {
        name: `Public read ${bucketId}`,
        command: "select",
        usingClause: `bucket_id = ${safeBucketLiteral}`,
        checkClause: "",
      },
      {
        name: `Public insert ${bucketId}`,
        command: "insert",
        usingClause: "",
        checkClause: `bucket_id = ${safeBucketLiteral}`,
      },
      {
        name: `Public update ${bucketId}`,
        command: "update",
        usingClause: `bucket_id = ${safeBucketLiteral}`,
        checkClause: `bucket_id = ${safeBucketLiteral}`,
      },
    ];

    for (const policy of policyDefinitions) {
      const existingPolicy = await client.query(
        `
select 1
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname = $1
        `,
        [policy.name]
      );

      if (existingPolicy.rowCount > 0) {
        continue;
      }

      const usingSql = policy.usingClause ? ` using (${policy.usingClause})` : "";
      const checkSql = policy.checkClause ? ` with check (${policy.checkClause})` : "";
      await client.query(
        `create policy "${policy.name}" on storage.objects for ${policy.command} to public${usingSql}${checkSql};`
      );
    }

    await client.query("COMMIT");
    console.log(`Bucket ${bucketId} configurado no Supabase Storage com politicas publicas.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

ensureBucketAndPolicies().catch((error) => {
  console.error(error && error.message ? error.message : error);
  process.exitCode = 1;
});
