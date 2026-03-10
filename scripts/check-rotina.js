#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const http = require("http");
const { execSync } = require("child_process");

const projectRoot = process.cwd();

function logStep(title) {
  process.stdout.write(`\n[check:rotina] ${title}\n`);
}

function logOk(message) {
  process.stdout.write(`[ok] ${message}\n`);
}

function logWarn(message) {
  process.stdout.write(`[warn] ${message}\n`);
}

function logFail(message) {
  process.stderr.write(`[fail] ${message}\n`);
}

function collectFilesRecursive(baseDir, predicate) {
  const output = [];
  if (!fs.existsSync(baseDir)) return output;

  const stack = [baseDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
        continue;
      }
      if (!predicate || predicate(absolute)) output.push(absolute);
    }
  }
  return output;
}

function runNodeSyntaxCheck(filePath) {
  execSync(`node --check "${filePath}"`, {
    stdio: "pipe",
    cwd: projectRoot,
  });
}

function checkJsSyntax() {
  logStep("Validando sintaxe JS");
  const srcDir = path.resolve(projectRoot, "src");
  const srcJsFiles = collectFilesRecursive(srcDir, (file) => file.endsWith(".js"));
  const extraFiles = ["script.js", "src/server.js", "src/app.js"]
    .map((relativePath) => path.resolve(projectRoot, relativePath))
    .filter((absolutePath) => fs.existsSync(absolutePath));

  const files = Array.from(new Set([...srcJsFiles, ...extraFiles]));
  for (const file of files) runNodeSyntaxCheck(file);
  logOk(`${files.length} arquivos JS validados`);
}

function checkPrismaSchema() {
  logStep("Validando schema Prisma");
  execSync("npx prisma validate", {
    stdio: "pipe",
    cwd: projectRoot,
  });
  logOk("Schema Prisma valido");
}

function requestPath(port, routePath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: routePath,
        method: "GET",
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({
            status: Number(res.statusCode) || 0,
            body,
          });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function checkHttpSmokeRoutes() {
  logStep("Smoke test HTTP (health + rotas principais)");
  const { createApp } = require(path.resolve(projectRoot, "src/app"));
  const app = createApp();

  const routes = [
    "/health",
    "/api/health",
    "/api/instructor/workouts?includeInactive=true",
    "/api/users/students",
    "/api/workouts/templates?includeInactive=true",
    "/api/library/exercises",
    "/api/admin/overview",
  ];

  await new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const address = server.address();
      const port = address && typeof address === "object" ? address.port : 0;

      try {
        const results = [];
        for (const routePath of routes) {
          const result = await requestPath(port, routePath);
          results.push({ routePath, ...result });
        }

        const rootHealth = results.find((item) => item.routePath === "/health");
        const apiHealth = results.find((item) => item.routePath === "/api/health");

        if (!rootHealth || rootHealth.status !== 200) {
          throw new Error("/health nao respondeu 200");
        }
        if (!apiHealth || apiHealth.status !== 200) {
          throw new Error("/api/health nao respondeu 200");
        }

        const protectedRoutes = results.filter(
          (item) => item.routePath !== "/health" && item.routePath !== "/api/health"
        );
        for (const item of protectedRoutes) {
          if (item.status !== 401 && item.status !== 403) {
            throw new Error(`${item.routePath} retornou status inesperado ${item.status}`);
          }
        }

        logOk("Health routes 200 e rotas protegidas responderam sem 404");
        server.close(resolve);
      } catch (error) {
        server.close(() => reject(error));
      }
    });

    server.on("error", reject);
  });
}

function checkLocalAssetReferences() {
  logStep("Validando referencias locais no index.html");
  const indexPath = path.resolve(projectRoot, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error("index.html nao encontrado");
  }

  const html = fs.readFileSync(indexPath, "utf8");
  const regex = /(?:src|href)="([^"]+)"/g;
  const checked = new Set();
  const missing = [];
  let match;

  while ((match = regex.exec(html))) {
    const raw = String(match[1] || "").trim();
    if (!raw) continue;
    if (
      raw.startsWith("http://") ||
      raw.startsWith("https://") ||
      raw.startsWith("data:") ||
      raw.startsWith("#") ||
      raw.startsWith("mailto:") ||
      raw.startsWith("tel:")
    ) {
      continue;
    }

    const cleaned = raw.split("?")[0];
    if (!cleaned) continue;
    if (checked.has(cleaned)) continue;
    checked.add(cleaned);

    const absolute = path.resolve(projectRoot, cleaned);
    if (!fs.existsSync(absolute)) missing.push(cleaned);
  }

  if (missing.length) {
    missing.forEach((item) => logFail(`asset nao encontrado: ${item}`));
    throw new Error(`${missing.length} assets locais ausentes`);
  }

  logOk(`${checked.size} referencias locais verificadas (0 ausentes)`);
}

function checkKnownLogs() {
  logStep("Varredura rapida de logs");
  const logFiles = ["api-dev.log", "api-run.log"].map((file) => path.resolve(projectRoot, file));
  const regex = /(error|failed|exception|route not found|rota nao encontrada)/i;
  let anyLogFound = false;

  for (const absolutePath of logFiles) {
    if (!fs.existsSync(absolutePath)) continue;
    anyLogFound = true;
    const content = fs.readFileSync(absolutePath, "utf8");
    if (regex.test(content)) {
      logWarn(`possiveis alertas em ${path.basename(absolutePath)} (revisar manualmente)`);
    } else {
      logOk(`${path.basename(absolutePath)} sem alertas por padrao de busca`);
    }
  }

  if (!anyLogFound) {
    logWarn("nenhum arquivo de log local encontrado");
  }
}

async function main() {
  const startedAt = Date.now();
  const tasks = [
    checkJsSyntax,
    checkPrismaSchema,
    checkHttpSmokeRoutes,
    checkLocalAssetReferences,
    checkKnownLogs,
  ];

  for (const task of tasks) {
    await task();
  }

  const elapsedMs = Date.now() - startedAt;
  logStep(`Rotina finalizada em ${(elapsedMs / 1000).toFixed(1)}s`);
  logOk("Tudo certo");
}

main().catch((error) => {
  logFail(error && error.message ? error.message : String(error));
  process.exit(1);
});

